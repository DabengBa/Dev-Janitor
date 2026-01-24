//! Tauri commands for tool detection and management

use crate::detection::{scan_all_tools, ToolInfo};

use crate::utils::command::command_no_window;

/// Scan for all development tools
#[tauri::command]
pub fn scan_tools() -> Vec<ToolInfo> {
    scan_all_tools()
}

/// Get tool info by ID
#[tauri::command]
pub fn get_tool_info(tool_id: String) -> Option<ToolInfo> {
    let tools = scan_all_tools();
    tools.into_iter().find(|t| t.id == tool_id)
}

/// Uninstall a tool
#[tauri::command]
pub fn uninstall_tool(tool_id: String, path: String) -> Result<String, String> {
    // Get uninstall command based on tool type
    let uninstall_result = match tool_id.as_str() {
        // Package managers installed via npm
        "pnpm" | "yarn" => run_command("npm", &["uninstall", "-g", &tool_id]),

        // Python tools
        "pip" | "pipx" | "poetry" | "uv" => {
            // pipx-installed tools
            run_command("pipx", &["uninstall", &tool_id])
        }

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

        // AI CLI tools (npm-based)
        "codex" => run_command("npm", &["uninstall", "-g", "@openai/codex"]),
        "claude" => run_command("npm", &["uninstall", "-g", "@anthropic-ai/claude-code"]),
        "gemini" => run_command("npm", &["uninstall", "-g", "@google/gemini-cli"]),
        "opencode" => run_command("npm", &["uninstall", "-g", "opencode"]),
        "iflow" => run_command("npm", &["uninstall", "-g", "iflow"]),

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

/// Run a command and return result
fn run_command(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = command_no_window(cmd).args(args).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(format!(
                    "Successfully executed: {} {}\n{}",
                    cmd,
                    args.join(" "),
                    stdout
                ))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                Err(format!("Command failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}
