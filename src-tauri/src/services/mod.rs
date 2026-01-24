//! Service monitoring module for Dev Janitor v2
//! Port scanning and process management using sysinfo

use serde::{Deserialize, Serialize};
use sysinfo::{Pid, ProcessStatus, System};

use crate::utils::command::command_no_window;

/// Represents a running process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub exe_path: String,
    pub memory: u64,
    pub memory_display: String,
    pub cpu: f32,
    pub status: String,
    pub category: String,
}

/// Represents a port in use
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: String,
    pub pid: u32,
    pub process_name: String,
    pub state: String,
}

/// Development-related process patterns
const DEV_PROCESS_PATTERNS: &[(&str, &str)] = &[
    // Runtimes
    ("node", "Runtime"),
    ("python", "Runtime"),
    ("ruby", "Runtime"),
    ("java", "Runtime"),
    ("dotnet", "Runtime"),
    ("go", "Runtime"),
    ("deno", "Runtime"),
    ("bun", "Runtime"),
    ("php", "Runtime"),
    // Package Managers
    ("npm", "Package Manager"),
    ("pnpm", "Package Manager"),
    ("yarn", "Package Manager"),
    ("pip", "Package Manager"),
    ("cargo", "Package Manager"),
    ("composer", "Package Manager"),
    // Build Tools
    ("webpack", "Build Tool"),
    ("vite", "Build Tool"),
    ("esbuild", "Build Tool"),
    ("tsc", "Build Tool"),
    ("rollup", "Build Tool"),
    ("parcel", "Build Tool"),
    ("turbo", "Build Tool"),
    ("nx", "Build Tool"),
    ("gradle", "Build Tool"),
    ("maven", "Build Tool"),
    ("make", "Build Tool"),
    ("cmake", "Build Tool"),
    ("ninja", "Build Tool"),
    // Servers
    ("nginx", "Server"),
    ("apache", "Server"),
    ("httpd", "Server"),
    ("caddy", "Server"),
    ("postgres", "Database"),
    ("mysql", "Database"),
    ("mongod", "Database"),
    ("redis", "Database"),
    ("sqlite", "Database"),
    // Containers
    ("docker", "Container"),
    ("podman", "Container"),
    ("containerd", "Container"),
    ("kubectl", "Container"),
    // IDEs & Editors
    ("code", "IDE"),
    ("cursor", "IDE"),
    ("idea", "IDE"),
    ("webstorm", "IDE"),
    ("pycharm", "IDE"),
    ("eclipse", "IDE"),
    ("vim", "Editor"),
    ("nvim", "Editor"),
    ("emacs", "Editor"),
    // AI Tools
    ("codex", "AI Tool"),
    ("claude", "AI Tool"),
    ("gemini", "AI Tool"),
    ("copilot", "AI Tool"),
    ("aider", "AI Tool"),
    // Version Control
    ("git", "Version Control"),
    ("gh", "Version Control"),
    // Dev Servers
    ("next", "Dev Server"),
    ("nuxt", "Dev Server"),
    ("remix", "Dev Server"),
    ("gatsby", "Dev Server"),
    ("astro", "Dev Server"),
];

/// Format bytes to human readable
fn format_memory(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

/// Get process category based on name
fn get_process_category(name: &str) -> Option<String> {
    let name_lower = name.to_lowercase();

    for (pattern, category) in DEV_PROCESS_PATTERNS {
        if name_lower.contains(pattern) {
            return Some(category.to_string());
        }
    }

    None
}

/// Get all running development-related processes
pub fn get_dev_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .filter_map(|(pid, process)| {
            let name = process.name().to_string_lossy().to_string();

            if let Some(category) = get_process_category(&name) {
                let exe_path = process
                    .exe()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                let status = match process.status() {
                    ProcessStatus::Run => "Running",
                    ProcessStatus::Sleep => "Sleeping",
                    ProcessStatus::Idle => "Idle",
                    ProcessStatus::Zombie => "Zombie",
                    ProcessStatus::Stop => "Stopped",
                    _ => "Unknown",
                };

                let memory = process.memory();

                Some(ProcessInfo {
                    pid: pid.as_u32(),
                    name,
                    exe_path,
                    memory,
                    memory_display: format_memory(memory),
                    cpu: process.cpu_usage(),
                    status: status.to_string(),
                    category,
                })
            } else {
                None
            }
        })
        .collect();

    // Sort by memory descending
    processes.sort_by(|a, b| b.memory.cmp(&a.memory));
    processes
}

/// Get all processes (not just dev-related)
pub fn get_all_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, process)| {
            let name = process.name().to_string_lossy().to_string();
            let exe_path = process
                .exe()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let status = match process.status() {
                ProcessStatus::Run => "Running",
                ProcessStatus::Sleep => "Sleeping",
                ProcessStatus::Idle => "Idle",
                ProcessStatus::Zombie => "Zombie",
                ProcessStatus::Stop => "Stopped",
                _ => "Unknown",
            };

            let memory = process.memory();
            let category = get_process_category(&name).unwrap_or_else(|| "Other".to_string());

            ProcessInfo {
                pid: pid.as_u32(),
                name,
                exe_path,
                memory,
                memory_display: format_memory(memory),
                cpu: process.cpu_usage(),
                status: status.to_string(),
                category,
            }
        })
        .collect();

    // Sort by memory descending
    processes.sort_by(|a, b| b.memory.cmp(&a.memory));
    processes
}

/// Kill a process by PID
pub fn kill_process(pid: u32) -> Result<String, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let pid_obj = Pid::from_u32(pid);

    if let Some(process) = sys.process(pid_obj) {
        let name = process.name().to_string_lossy().to_string();

        if process.kill() {
            Ok(format!(
                "Successfully terminated process: {} (PID: {})",
                name, pid
            ))
        } else {
            Err(format!(
                "Failed to terminate process: {} (PID: {})",
                name, pid
            ))
        }
    } else {
        Err(format!("Process not found: PID {}", pid))
    }
}

/// Get ports in use (using netstat on Windows, ss/lsof on Unix)
pub fn get_ports_in_use() -> Vec<PortInfo> {
    #[cfg(target_os = "windows")]
    {
        get_ports_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        get_ports_unix()
    }
}

#[cfg(target_os = "windows")]
fn get_ports_windows() -> Vec<PortInfo> {
    let output = command_no_window("netstat").args(["-ano"]).output();

    let output = match output {
        Ok(o) => o,
        Err(_) => return Vec::new(),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports = Vec::new();
    let mut sys = System::new_all();
    sys.refresh_all();

    // Parse netstat output
    for line in stdout.lines().skip(4) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            let protocol = parts[0].to_uppercase();
            if protocol != "TCP" && protocol != "UDP" {
                continue;
            }

            // Parse local address
            let local_addr = parts[1];
            if let Some(port_str) = local_addr.rsplit(':').next() {
                if let Ok(port) = port_str.parse::<u16>() {
                    let state = if protocol == "TCP" && parts.len() > 3 {
                        parts[3].to_string()
                    } else {
                        "N/A".to_string()
                    };

                    let pid_idx = if protocol == "TCP" { 4 } else { 3 };
                    let pid: u32 = parts.get(pid_idx).and_then(|s| s.parse().ok()).unwrap_or(0);

                    let process_name = sys
                        .process(Pid::from_u32(pid))
                        .map(|p| p.name().to_string_lossy().to_string())
                        .unwrap_or_else(|| "Unknown".to_string());

                    ports.push(PortInfo {
                        port,
                        protocol,
                        pid,
                        process_name,
                        state,
                    });
                }
            }
        }
    }

    // Remove duplicates and sort by port
    let mut seen = std::collections::HashSet::new();
    ports.retain(|p| seen.insert((p.port, p.protocol.clone())));
    ports.sort_by_key(|p| p.port);
    ports
}

#[cfg(not(target_os = "windows"))]
fn get_ports_unix() -> Vec<PortInfo> {
    // Try ss first, then lsof
    let output = command_no_window("ss").args(["-tulpn"]).output();

    let output = match output {
        Ok(o) if o.status.success() => o,
        _ => {
            // Try lsof
            match command_no_window("lsof").args(["-i", "-P", "-n"]).output() {
                Ok(o) => o,
                Err(_) => return Vec::new(),
            }
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports = Vec::new();

    // Parse ss output format
    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            let protocol = parts[0].to_uppercase();
            if !protocol.starts_with("TCP") && !protocol.starts_with("UDP") {
                continue;
            }

            let local_addr = parts[4];
            if let Some(port_str) = local_addr.rsplit(':').next() {
                if let Ok(port) = port_str.parse::<u16>() {
                    let state = if parts.len() > 1 {
                        parts[1].to_string()
                    } else {
                        "N/A".to_string()
                    };

                    // Extract PID from the process field
                    let pid: u32 = parts
                        .get(6)
                        .and_then(|s| {
                            s.split("pid=")
                                .nth(1)
                                .and_then(|p| p.split(',').next())
                                .and_then(|p| p.parse().ok())
                        })
                        .unwrap_or(0);

                    let process_name = parts
                        .get(6)
                        .and_then(|s| s.split('"').nth(1))
                        .unwrap_or("Unknown")
                        .to_string();

                    ports.push(PortInfo {
                        port,
                        protocol: protocol.replace("6", ""),
                        pid,
                        process_name,
                        state,
                    });
                }
            }
        }
    }

    ports.sort_by_key(|p| p.port);
    ports
}

/// Get commonly used dev ports
pub fn get_common_dev_ports() -> Vec<PortInfo> {
    let all_ports = get_ports_in_use();
    let common_ports: Vec<u16> = vec![
        80, 443, 3000, 3001, 3333, 4000, 4200, 5000, 5173, 5174, 5432, 8000, 8080, 8081, 8443,
        8888, 9000, 9229, 27017,
    ];

    all_ports
        .into_iter()
        .filter(|p| common_ports.contains(&p.port))
        .collect()
}
