//! Core security scanning logic
//!
//! This module implements the actual scanning functionality using the rules
//! defined in definitions.rs

use crate::services::{get_ports_in_use, PortInfo};
use chrono::Local;
use std::collections::HashSet;
use std::env;
use std::fs;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::time::Duration;
use sysinfo::System;
use glob::Pattern;

use super::definitions::{
    AiToolSecurityRule, ConfigCheckType, RiskLevel, SecurityFinding,
    SecurityScanResult, SecuritySummary, get_rules,
};

/// Check if a port is actively listening and potentially exposed
fn check_port_binding(port: u16) -> Option<String> {
    // Try to connect to the port to see if something is listening
    let timeout = Duration::from_millis(100);

    // Check localhost first
    if let Ok(addr) = format!("127.0.0.1:{}", port).parse() {
        if TcpStream::connect_timeout(&addr, timeout).is_ok() {
            return Some("Listening on localhost".into());
        }
    }

    None
}

fn is_safe_binding(local_address: &str, safe_bindings: &[String]) -> bool {
    if local_address.is_empty() {
        return false;
    }

    let addr = local_address.to_lowercase();

    if addr.contains("127.0.0.1") || addr.contains("::1") || addr.contains("localhost") {
        return true;
    }

    safe_bindings
        .iter()
        .any(|safe| addr.contains(&safe.to_lowercase()))
}

/// Get home directory cross-platform
fn get_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        env::var("HOME").ok().map(PathBuf::from)
    }
}

/// Check exposed ports for a tool
pub fn check_exposed_ports(
    tool: &AiToolSecurityRule,
    ports_info: &[PortInfo],
) -> Vec<SecurityFinding> {
    let mut findings = Vec::new();

    for port_rule in &tool.ports {
        let mut safe_binding_found = false;
        let mut reported_for_port = false;

        // Check if the port is in use
        for p in ports_info {
            if p.port == port_rule.port {
                let is_safe = is_safe_binding(&p.local_address, &port_rule.safe_bindings);
                if is_safe {
                    safe_binding_found = true;
                }

                if !is_safe {
                    findings.push(SecurityFinding {
                        tool_id: tool.id.clone(),
                        tool_name: tool.name.clone(),
                        issue: format!("Port {} ({}) is exposed", port_rule.port, port_rule.name),
                        description: port_rule.description.clone(),
                        risk_level: port_rule.risk_if_exposed,
                        remediation: format!(
                            "Bind {} to localhost only (127.0.0.1) or use a firewall",
                            port_rule.name
                        ),
                        details: format!(
                            "Process: {}, State: {}, PID: {}, Local: {}",
                            p.process_name,
                            p.state,
                            p.pid,
                            if p.local_address.is_empty() {
                                "unknown"
                            } else {
                                &p.local_address
                            }
                        ),
                    });
                    reported_for_port = true;
                }
            }
        }

        // Also try direct connection check
        if !safe_binding_found && !reported_for_port {
            let status = check_port_binding(port_rule.port);
            // Port is listening - warn even if we couldn't determine exposure
            if let Some(status) = status {
                findings.push(SecurityFinding {
                    tool_id: tool.id.clone(),
                    tool_name: tool.name.clone(),
                    issue: format!(
                        "Port {} ({}) is active",
                        port_rule.port, port_rule.name
                    ),
                    description: port_rule.description.clone(),
                    risk_level: if port_rule.risk_if_exposed == RiskLevel::Critical {
                        RiskLevel::High
                    } else {
                        RiskLevel::Medium
                    },
                    remediation: format!(
                        "Verify {} is only accessible from trusted networks",
                        port_rule.name
                    ),
                    details: status,
                });
            }
        }
    }

    findings
}

/// Check config files for security issues
pub fn check_config_files(tool: &AiToolSecurityRule) -> Vec<SecurityFinding> {
    let mut findings = Vec::new();
    let home = match get_home_dir() {
        Some(h) => h,
        None => return findings,
    };

    for config_rule in &tool.configs {
        match &config_rule.check {
            ConfigCheckType::FileContains { path_pattern, pattern } => {
                let files = collect_matching_files(&home, &tool.config_paths, path_pattern);
                for file_path in files {
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        let patterns: Vec<&str> = pattern.split('|').collect();
                        for p in patterns {
                            if content.contains(p) {
                                findings.push(SecurityFinding {
                                    tool_id: tool.id.clone(),
                                    tool_name: tool.name.clone(),
                                    issue: config_rule.name.clone(),
                                    description: config_rule.description.clone(),
                                    risk_level: config_rule.risk_level,
                                    remediation: config_rule.remediation.clone(),
                                    details: format!("Found in: {}", file_path.display()),
                                });
                                break;
                            }
                        }
                    }
                }
            }
            ConfigCheckType::FileExists { path_pattern } => {
                let files = collect_matching_files(&home, &tool.config_paths, path_pattern);
                for file_path in files {
                    findings.push(SecurityFinding {
                        tool_id: tool.id.clone(),
                        tool_name: tool.name.clone(),
                        issue: config_rule.name.clone(),
                        description: config_rule.description.clone(),
                        risk_level: config_rule.risk_level,
                        remediation: config_rule.remediation.clone(),
                        details: format!("File exists: {}", file_path.display()),
                    });
                }
            }
            ConfigCheckType::FileMissing { path_pattern, pattern } => {
                let files = collect_matching_files(&home, &tool.config_paths, path_pattern);
                if files.is_empty() {
                    continue;
                }

                let mut missing_files = Vec::new();
                let mut found = false;

                for file_path in files {
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        if content.contains(pattern) {
                            found = true;
                            break;
                        } else {
                            missing_files.push(file_path);
                        }
                    }
                }

                if !found && !missing_files.is_empty() {
                    let detail = if missing_files.len() == 1 {
                        format!(
                            "Missing '{}' in: {}",
                            pattern,
                            missing_files[0].display()
                        )
                    } else {
                        format!(
                            "Missing '{}' in {} files (e.g., {})",
                            pattern,
                            missing_files.len(),
                            missing_files[0].display()
                        )
                    };

                    findings.push(SecurityFinding {
                        tool_id: tool.id.clone(),
                        tool_name: tool.name.clone(),
                        issue: config_rule.name.clone(),
                        description: config_rule.description.clone(),
                        risk_level: config_rule.risk_level,
                        remediation: config_rule.remediation.clone(),
                        details: detail,
                    });
                }
            }
            ConfigCheckType::EnvVar { name, insecure_value } => {
                if let Ok(value) = env::var(name) {
                    if let Some(insecure) = insecure_value {
                        if value == *insecure {
                            findings.push(SecurityFinding {
                                tool_id: tool.id.clone(),
                                tool_name: tool.name.clone(),
                                issue: config_rule.name.clone(),
                                description: config_rule.description.clone(),
                                risk_level: config_rule.risk_level,
                                remediation: config_rule.remediation.clone(),
                                details: format!("Env var {} has insecure value", name),
                            });
                        }
                    }
                }
            }
        }
    }

    findings
}

fn collect_matching_files(
    home: &Path,
    config_paths: &[String],
    path_pattern: &str,
) -> Vec<PathBuf> {
    let mut files = HashSet::new();
    let pattern = if path_pattern.is_empty() {
        "**/*"
    } else {
        path_pattern
    };

    for config_path in config_paths {
        let full_path = home.join(config_path);
        if full_path.is_file() {
            if file_matches_pattern(&full_path, pattern) {
                files.insert(full_path);
            }
            continue;
        }

        if full_path.is_dir() {
            let base = full_path.to_string_lossy().replace('\\', "/");
            let pat = pattern.replace('\\', "/");
            let full_pattern = format!(
                "{}/{}",
                base.trim_end_matches('/'),
                pat.trim_start_matches('/')
            );

            if let Ok(entries) = glob::glob(&full_pattern) {
                for entry in entries.flatten() {
                    if entry.is_file() {
                        files.insert(entry);
                    }
                }
            }
        }
    }

    files.into_iter().collect()
}

fn file_matches_pattern(path: &Path, pattern: &str) -> bool {
    if pattern.is_empty() {
        return true;
    }

    let file_name = match path.file_name() {
        Some(name) => name.to_string_lossy(),
        None => return true,
    };

    let pattern = pattern.replace('\\', "/");
    let tail = pattern
        .rsplit('/')
        .next()
        .unwrap_or(pattern.as_str())
        .trim_start_matches("**/");

    Pattern::new(tail)
        .map(|p| p.matches(&file_name))
        .unwrap_or(true)
}

/// Check if a tool's process is running
#[allow(dead_code)]
fn is_tool_running(tool: &AiToolSecurityRule) -> bool {
    let mut sys = System::new_all();
    sys.refresh_all();

    for process in sys.processes().values() {
        let name = process.name().to_string_lossy().to_lowercase();
        for pattern in &tool.process_names {
            if name.contains(pattern) {
                return true;
            }
        }
    }
    false
}

/// Get all security findings
pub fn get_security_findings() -> Vec<SecurityFinding> {
    let ports_info = get_ports_in_use();
    let rules = get_rules();
    let mut all_findings = Vec::new();

    for tool in rules.iter() {
        // Check ports
        let port_findings = check_exposed_ports(tool, &ports_info);
        all_findings.extend(port_findings);

        // Check configs
        let config_findings = check_config_files(tool);
        all_findings.extend(config_findings);
    }

    // Sort by risk level (Critical first)
    all_findings.sort_by(|a, b| {
        let risk_order = |r: &RiskLevel| match r {
            RiskLevel::Critical => 0,
            RiskLevel::High => 1,
            RiskLevel::Medium => 2,
            RiskLevel::Low => 3,
        };
        risk_order(&a.risk_level).cmp(&risk_order(&b.risk_level))
    });

    all_findings
}

/// Perform a complete security scan
pub fn scan_ai_tool_security() -> SecurityScanResult {
    let findings = get_security_findings();
    let rules = get_rules();

    let summary = SecuritySummary {
        total_findings: findings.len(),
        critical: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::Critical)
            .count(),
        high: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::High)
            .count(),
        medium: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::Medium)
            .count(),
        low: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::Low)
            .count(),
    };

    let tools_scanned: Vec<String> = rules
        .iter()
        .map(|t| t.name.clone())
        .collect();

    SecurityScanResult {
        scan_time: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        tools_scanned,
        findings,
        summary,
    }
}

/// Scan a specific tool only
pub fn scan_specific_tool(tool_id: &str) -> Option<SecurityScanResult> {
    let rules = get_rules();
    let tool = rules
        .iter()
        .find(|t| t.id == tool_id)?;

    let ports_info = get_ports_in_use();
    let mut findings = Vec::new();

    findings.extend(check_exposed_ports(tool, &ports_info));
    findings.extend(check_config_files(tool));

    let summary = SecuritySummary {
        total_findings: findings.len(),
        critical: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::Critical)
            .count(),
        high: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::High)
            .count(),
        medium: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::Medium)
            .count(),
        low: findings
            .iter()
            .filter(|f| f.risk_level == RiskLevel::Low)
            .count(),
    };

    Some(SecurityScanResult {
        scan_time: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        tools_scanned: vec![tool.name.clone()],
        findings,
        summary,
    })
}

/// Get list of all supported tools
#[allow(dead_code)]
pub fn get_supported_tools() -> Vec<(String, String, String)> {
    get_rules()
        .iter()
        .map(|t| (t.id.clone(), t.name.clone(), t.description.clone()))
        .collect()
}
