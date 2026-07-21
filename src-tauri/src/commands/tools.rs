//! Tauri commands for tool detection and management

use crate::ai_tools::normalize_ai_tool_id;
use crate::detection::{scan_all_tools, ToolInfo};

use super::run_blocking;
use crate::ai_cli;
use crate::utils::command::{command_output_with_timeout, command_output_with_timeout_vec};
use std::time::Duration;

/// Scan for all development tools
#[tauri::command]
pub async fn scan_tools() -> Result<Vec<ToolInfo>, String> {
    run_blocking(scan_all_tools).await
}

/// Get tool info by ID
#[tauri::command]
pub async fn get_tool_info(
    #[allow(non_snake_case)] toolId: String,
) -> Result<Option<ToolInfo>, String> {
    run_blocking(move || {
        let tools = scan_all_tools();
        tools.into_iter().find(|t| t.id == toolId)
    })
    .await
}

/// Uninstall a tool
#[tauri::command]
pub async fn uninstall_tool(
    #[allow(non_snake_case)] toolId: String,
    path: String,
) -> Result<String, String> {
    run_blocking(move || uninstall_tool_sync(&toolId, &path)).await?
}

fn uninstall_tool_sync(tool_id: &str, path: &str) -> Result<String, String> {
    // Get uninstall command based on tool type
    let uninstall_result = match tool_id {
        // Package managers installed via npm
        "pnpm" | "yarn" => run_command("npm", &["uninstall", "-g", tool_id]),

        // Python tools
        "pipx" => uninstall_with_pip("pipx"),
        "poetry" => {
            run_command("pipx", &["uninstall", "poetry"]).or_else(|_| uninstall_with_pip("poetry"))
        }
        "uv" => run_command("pipx", &["uninstall", "uv"]).or_else(|_| uninstall_with_pip("uv")),
        "pip" => Err("pip is part of Python and should not be uninstalled separately".to_string()),

        // Rust tools
        "cargo" | "rustup" => Err(
            "Rust toolchain should be uninstalled via rustup. Run: rustup self uninstall"
                .to_string(),
        ),

        // Version managers - special handling
        "nvm" => {
            #[cfg(target_os = "windows")]
            {
                Err(
                    "nvm for Windows should be uninstalled from Windows Settings > Apps"
                        .to_string(),
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                Err("Remove nvm by deleting ~/.nvm and removing the source lines from your shell config".to_string())
            }
        }

        "pyenv" => {
            #[cfg(target_os = "windows")]
            {
                Err("pyenv-win should be uninstalled by removing the .pyenv folder from your user directory".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Err("Remove pyenv by deleting ~/.pyenv and removing the init lines from your shell config".to_string())
            }
        }

        // AI CLI tools - defer to dedicated module (handles latest install methods)
        id if normalize_ai_tool_id(id).is_some() => ai_cli::uninstall_ai_tool(tool_id),

        // System-level tools - provide instructions
        "node" | "python" | "java" | "go" | "ruby" | "php" | "dotnet" | "deno" | "bun" => {
            #[cfg(target_os = "windows")]
            {
                Err(format!(
                    "{} should be uninstalled from Windows Settings > Apps",
                    tool_id
                ))
            }
            #[cfg(target_os = "macos")]
            {
                Err(format!("{} should be uninstalled via Homebrew (brew uninstall {}) or from the original installer", tool_id, tool_id))
            }
            #[cfg(target_os = "linux")]
            {
                Err(format!(
                    "{} should be uninstalled via your package manager (apt/yum/pacman)",
                    tool_id
                ))
            }
        }

        // Docker and containers
        "docker" | "podman" | "kubectl" => Err(format!(
            "{} should be uninstalled from your system's application management",
            tool_id
        )),

        // Build tools
        "cmake" | "make" | "ninja" => Err(format!(
            "{} should be uninstalled via your system's package manager",
            tool_id
        )),

        // Version control
        "git" | "svn" => Err(format!(
            "{} should be uninstalled via your system's package manager or installer",
            tool_id
        )),

        _ => Err(format!(
            "Uninstall method for {} is not configured. Path: {}",
            tool_id, path
        )),
    };

    uninstall_result
}

/// Run a command and return result (with 120s timeout)
fn run_command(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = command_output_with_timeout(cmd, args, Duration::from_secs(120));

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let combined = format!("{}{}", stdout, stderr).trim().to_string();

            if output.status.success() {
                Ok(format!(
                    "Successfully executed: {} {}\n{}",
                    cmd,
                    args.join(" "),
                    combined
                ))
            } else {
                Err(format!("Command failed: {}", combined))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

fn run_owned_command(cmd: &str, args: &[String]) -> Result<String, String> {
    match command_output_with_timeout_vec(cmd, args, Duration::from_secs(120)) {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let combined = format!("{}{}", stdout, stderr).trim().to_string();

            if output.status.success() {
                Ok(format!(
                    "Successfully executed: {} {}\n{}",
                    cmd,
                    args.join(" "),
                    combined
                ))
            } else {
                Err(format!("Command failed: {}", combined))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

fn uninstall_with_pip(package: &str) -> Result<String, String> {
    let mut candidates: Vec<(&str, Vec<String>)> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        candidates.push((
            "py",
            vec![
                "-m".to_string(),
                "pip".to_string(),
                "uninstall".to_string(),
                "-y".to_string(),
                package.to_string(),
            ],
        ));
        candidates.push((
            "python",
            vec![
                "-m".to_string(),
                "pip".to_string(),
                "uninstall".to_string(),
                "-y".to_string(),
                package.to_string(),
            ],
        ));
    }

    #[cfg(not(target_os = "windows"))]
    {
        candidates.push((
            "python3",
            vec![
                "-m".to_string(),
                "pip".to_string(),
                "uninstall".to_string(),
                "-y".to_string(),
                package.to_string(),
            ],
        ));
        candidates.push((
            "python",
            vec![
                "-m".to_string(),
                "pip".to_string(),
                "uninstall".to_string(),
                "-y".to_string(),
                package.to_string(),
            ],
        ));
    }

    candidates.push((
        "pip",
        vec![
            "uninstall".to_string(),
            "-y".to_string(),
            package.to_string(),
        ],
    ));

    let mut last_error = None;
    for (cmd, args) in candidates {
        match run_owned_command(cmd, &args) {
            Ok(result) => return Ok(result),
            Err(error) => last_error = Some(error),
        }
    }

    Err(last_error.unwrap_or_else(|| format!("Failed to uninstall {}", package)))
}
