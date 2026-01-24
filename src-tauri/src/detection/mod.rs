//! Tool detection engine for Dev Janitor v2
//! Supports 39+ development tools with multi-version detection

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::utils::command::command_no_window;

/// Represents a detected tool version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolVersion {
    pub version: String,
    pub path: String,
    pub is_active: bool,
}

/// Represents a detected development tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInfo {
    pub id: String,
    pub name: String,
    pub category: String,
    pub versions: Vec<ToolVersion>,
    pub status: String, // "installed", "not_in_path", "multiple_versions"
}

/// Tool detection rule
#[derive(Debug, Clone)]
struct ToolRule {
    id: &'static str,
    name: &'static str,
    category: &'static str,
    commands: &'static [&'static str],
    version_args: &'static [&'static str],
    version_regex: Option<&'static str>,
}

/// Get all tool detection rules
fn get_tool_rules() -> Vec<ToolRule> {
    vec![
        // === Runtimes ===
        ToolRule {
            id: "node",
            name: "Node.js",
            category: "runtime",
            commands: &["node"],
            version_args: &["--version"],
            version_regex: Some(r"v?(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "python",
            name: "Python",
            category: "runtime",
            commands: &["python", "python3", "py"],
            version_args: &["--version"],
            version_regex: Some(r"Python (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "java",
            name: "Java",
            category: "runtime",
            commands: &["java"],
            version_args: &["-version"],
            version_regex: Some(r#"version "(\d+[\.\d+]*)""#),
        },
        ToolRule {
            id: "go",
            name: "Go",
            category: "runtime",
            commands: &["go"],
            version_args: &["version"],
            version_regex: Some(r"go(\d+\.\d+\.?\d*)"),
        },
        ToolRule {
            id: "rust",
            name: "Rust",
            category: "runtime",
            commands: &["rustc"],
            version_args: &["--version"],
            version_regex: Some(r"rustc (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "ruby",
            name: "Ruby",
            category: "runtime",
            commands: &["ruby"],
            version_args: &["--version"],
            version_regex: Some(r"ruby (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "php",
            name: "PHP",
            category: "runtime",
            commands: &["php"],
            version_args: &["--version"],
            version_regex: Some(r"PHP (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "dotnet",
            name: ".NET",
            category: "runtime",
            commands: &["dotnet"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.?\d*)"),
        },
        ToolRule {
            id: "deno",
            name: "Deno",
            category: "runtime",
            commands: &["deno"],
            version_args: &["--version"],
            version_regex: Some(r"deno (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "bun",
            name: "Bun",
            category: "runtime",
            commands: &["bun"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        // === Package Managers ===
        ToolRule {
            id: "npm",
            name: "npm",
            category: "package_manager",
            commands: &["npm"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "pnpm",
            name: "pnpm",
            category: "package_manager",
            commands: &["pnpm"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "yarn",
            name: "Yarn",
            category: "package_manager",
            commands: &["yarn"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "pip",
            name: "pip",
            category: "package_manager",
            commands: &["pip", "pip3"],
            version_args: &["--version"],
            version_regex: Some(r"pip (\d+\.\d+\.?\d*)"),
        },
        ToolRule {
            id: "cargo",
            name: "Cargo",
            category: "package_manager",
            commands: &["cargo"],
            version_args: &["--version"],
            version_regex: Some(r"cargo (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "composer",
            name: "Composer",
            category: "package_manager",
            commands: &["composer"],
            version_args: &["--version"],
            version_regex: Some(r"Composer version (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "maven",
            name: "Maven",
            category: "package_manager",
            commands: &["mvn"],
            version_args: &["--version"],
            version_regex: Some(r"Apache Maven (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "gradle",
            name: "Gradle",
            category: "package_manager",
            commands: &["gradle"],
            version_args: &["--version"],
            version_regex: Some(r"Gradle (\d+\.\d+\.?\d*)"),
        },
        ToolRule {
            id: "uv",
            name: "uv",
            category: "package_manager",
            commands: &["uv"],
            version_args: &["--version"],
            version_regex: Some(r"uv (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "pipx",
            name: "pipx",
            category: "package_manager",
            commands: &["pipx"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "poetry",
            name: "Poetry",
            category: "package_manager",
            commands: &["poetry"],
            version_args: &["--version"],
            version_regex: Some(r"Poetry \(version (\d+\.\d+\.\d+)\)"),
        },
        // === Version Managers ===
        ToolRule {
            id: "nvm",
            name: "nvm",
            category: "version_manager",
            commands: &["nvm"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "pyenv",
            name: "pyenv",
            category: "version_manager",
            commands: &["pyenv"],
            version_args: &["--version"],
            version_regex: Some(r"pyenv (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "rustup",
            name: "rustup",
            category: "version_manager",
            commands: &["rustup"],
            version_args: &["--version"],
            version_regex: Some(r"rustup (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "sdkman",
            name: "SDKMAN",
            category: "version_manager",
            commands: &["sdk"],
            version_args: &["version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        // === Build Tools ===
        ToolRule {
            id: "cmake",
            name: "CMake",
            category: "build_tool",
            commands: &["cmake"],
            version_args: &["--version"],
            version_regex: Some(r"cmake version (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "make",
            name: "Make",
            category: "build_tool",
            commands: &["make"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+)"),
        },
        ToolRule {
            id: "ninja",
            name: "Ninja",
            category: "build_tool",
            commands: &["ninja"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        // === Version Control ===
        ToolRule {
            id: "git",
            name: "Git",
            category: "version_control",
            commands: &["git"],
            version_args: &["--version"],
            version_regex: Some(r"git version (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "svn",
            name: "SVN",
            category: "version_control",
            commands: &["svn"],
            version_args: &["--version"],
            version_regex: Some(r"svn, version (\d+\.\d+\.\d+)"),
        },
        // === Containers ===
        ToolRule {
            id: "docker",
            name: "Docker",
            category: "container",
            commands: &["docker"],
            version_args: &["--version"],
            version_regex: Some(r"Docker version (\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "kubectl",
            name: "kubectl",
            category: "container",
            commands: &["kubectl"],
            version_args: &["version", "--client", "--short"],
            version_regex: Some(r"v(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "podman",
            name: "Podman",
            category: "container",
            commands: &["podman"],
            version_args: &["--version"],
            version_regex: Some(r"podman version (\d+\.\d+\.\d+)"),
        },
        // === AI CLI Tools ===
        ToolRule {
            id: "codex",
            name: "OpenAI Codex CLI",
            category: "ai_cli",
            commands: &["codex"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "claude",
            name: "Claude Code",
            category: "ai_cli",
            commands: &["claude"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "gemini",
            name: "Gemini CLI",
            category: "ai_cli",
            commands: &["gemini"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "opencode",
            name: "OpenCode",
            category: "ai_cli",
            commands: &["opencode"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
        ToolRule {
            id: "iflow",
            name: "iFlow CLI",
            category: "ai_cli",
            commands: &["iflow"],
            version_args: &["--version"],
            version_regex: Some(r"(\d+\.\d+\.\d+)"),
        },
    ]
}

/// Execute a command and capture output
fn execute_command(cmd: &str, args: &[&str]) -> Option<(String, String)> {
    let output = command_no_window(cmd).args(args).output().ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Some((stdout, stderr))
}

/// Find command path using which
fn find_command_path(cmd: &str) -> Option<PathBuf> {
    which::which(cmd).ok()
}

/// Extract version from output using regex
fn extract_version(output: &str, pattern: Option<&str>) -> Option<String> {
    use regex::Regex;

    if let Some(pattern) = pattern {
        let re = Regex::new(pattern).ok()?;
        let captures = re.captures(output)?;
        captures.get(1).map(|m| m.as_str().to_string())
    } else {
        // Try to find any version-like pattern
        let re = Regex::new(r"(\d+\.\d+\.?\d*)").ok()?;
        let captures = re.captures(output)?;
        captures.get(1).map(|m| m.as_str().to_string())
    }
}

/// Detect a single tool
fn detect_tool(rule: &ToolRule) -> Option<ToolInfo> {
    let mut versions: Vec<ToolVersion> = Vec::new();
    let mut found_paths: HashMap<String, bool> = HashMap::new();

    for cmd in rule.commands {
        // Try to find the command
        if let Some(path) = find_command_path(cmd) {
            let path_str = path.to_string_lossy().to_string();

            // Skip if we already found this path
            if found_paths.contains_key(&path_str) {
                continue;
            }
            found_paths.insert(path_str.clone(), true);

            // Try to get version
            if let Some((stdout, stderr)) = execute_command(cmd, rule.version_args) {
                let output = if stdout.trim().is_empty() {
                    &stderr
                } else {
                    &stdout
                };
                let version = extract_version(output, rule.version_regex)
                    .unwrap_or_else(|| "unknown".to_string());

                versions.push(ToolVersion {
                    version,
                    path: path_str,
                    is_active: versions.is_empty(), // First found is active
                });
            }
        }
    }

    // Check common installation paths for multiple versions
    #[cfg(target_os = "windows")]
    {
        let extra_paths = get_windows_extra_paths(rule.id);
        for extra_path in extra_paths {
            if extra_path.exists()
                && !found_paths.contains_key(&extra_path.to_string_lossy().to_string())
            {
                let cmd = extra_path.join(rule.commands[0]);
                if cmd.exists() {
                    if let Some((stdout, stderr)) =
                        execute_command(&cmd.to_string_lossy(), rule.version_args)
                    {
                        let output = if stdout.trim().is_empty() {
                            &stderr
                        } else {
                            &stdout
                        };
                        let version = extract_version(output, rule.version_regex)
                            .unwrap_or_else(|| "unknown".to_string());

                        versions.push(ToolVersion {
                            version,
                            path: extra_path.to_string_lossy().to_string(),
                            is_active: false,
                        });
                    }
                }
            }
        }
    }

    if versions.is_empty() {
        return None;
    }

    let status = if versions.len() > 1 {
        "multiple_versions".to_string()
    } else {
        "installed".to_string()
    };

    Some(ToolInfo {
        id: rule.id.to_string(),
        name: rule.name.to_string(),
        category: rule.category.to_string(),
        versions,
        status,
    })
}

/// Get extra paths to check on Windows for multi-version detection
#[cfg(target_os = "windows")]
fn get_windows_extra_paths(tool_id: &str) -> Vec<PathBuf> {
    use std::env;

    let mut paths = Vec::new();
    let home = env::var("USERPROFILE").unwrap_or_default();
    let program_files =
        env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
    let local_app_data = env::var("LOCALAPPDATA").unwrap_or_default();

    match tool_id {
        "python" => {
            // Check Python launcher paths
            paths.push(PathBuf::from(format!(
                "{}\\Python\\Python39",
                local_app_data
            )));
            paths.push(PathBuf::from(format!(
                "{}\\Python\\Python310",
                local_app_data
            )));
            paths.push(PathBuf::from(format!(
                "{}\\Python\\Python311",
                local_app_data
            )));
            paths.push(PathBuf::from(format!(
                "{}\\Python\\Python312",
                local_app_data
            )));
            paths.push(PathBuf::from(format!(
                "{}\\Python\\Python313",
                local_app_data
            )));
            // Anaconda/Miniconda
            paths.push(PathBuf::from(format!("{}\\Anaconda3", home)));
            paths.push(PathBuf::from(format!("{}\\Miniconda3", home)));
            // pyenv
            paths.push(PathBuf::from(format!(
                "{}\\.pyenv\\pyenv-win\\versions",
                home
            )));
        }
        "node" => {
            // nvm for Windows
            paths.push(PathBuf::from(format!(
                "{}\\nvm",
                env::var("NVM_HOME").unwrap_or_else(|_| format!("{}\\nvm", local_app_data))
            )));
        }
        "java" => {
            // Multiple Java installations
            let java_dir = PathBuf::from(format!("{}\\Java", program_files));
            if java_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(&java_dir) {
                    for entry in entries.flatten() {
                        paths.push(entry.path().join("bin"));
                    }
                }
            }
        }
        _ => {}
    }

    paths
}

/// Scan for all development tools
pub fn scan_all_tools() -> Vec<ToolInfo> {
    let rules = get_tool_rules();

    // Use parallel scanning for better performance
    rules.par_iter().filter_map(detect_tool).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_version() {
        let output = "node v20.11.0";
        let version = extract_version(output, Some(r"v?(\d+\.\d+\.\d+)"));
        assert_eq!(version, Some("20.11.0".to_string()));
    }

    #[test]
    fn test_scan_tools() {
        let tools = scan_all_tools();
        println!("Found {} tools", tools.len());
        for tool in &tools {
            println!("{}: {:?}", tool.name, tool.versions);
        }
    }
}
