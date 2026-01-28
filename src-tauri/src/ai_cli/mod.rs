//! AI CLI Tools management module for Dev Janitor v2
//! Manage AI coding assistant CLI tools

use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::time::Duration;

use crate::utils::command::{command_no_window, command_output_with_timeout};

/// Represents an AI CLI tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiCliTool {
    pub id: String,
    pub name: String,
    pub description: String,
    pub installed: bool,
    pub version: Option<String>,
    pub install_command: String,
    pub update_command: String,
    pub uninstall_command: String,
    pub docs_url: String,
    pub config_paths: Vec<AiConfigFile>,
}

/// Represents a config file for an AI CLI tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfigFile {
    pub name: String,
    pub path: String,
    pub exists: bool,
}

/// Get all supported AI CLI tools with their status
pub fn get_ai_cli_tools() -> Vec<AiCliTool> {
    vec![
        check_tool(AiCliTool {
            id: "claude".to_string(),
            name: "Claude Code".to_string(),
            description: "Anthropic's Claude AI coding assistant".to_string(),
            installed: false,
            version: None,
            install_command: "npm install -g @anthropic-ai/claude-code".to_string(),
            update_command: "npm update -g @anthropic-ai/claude-code".to_string(),
            uninstall_command: "npm uninstall -g @anthropic-ai/claude-code".to_string(),
            docs_url: "https://docs.anthropic.com/claude-code".to_string(),
            config_paths: find_config_files("claude"),
        }),
        check_tool(AiCliTool {
            id: "codex".to_string(),
            name: "OpenAI Codex CLI".to_string(),
            description: "OpenAI's Codex coding assistant".to_string(),
            installed: false,
            version: None,
            install_command: "npm install -g @openai/codex".to_string(),
            update_command: "npm update -g @openai/codex".to_string(),
            uninstall_command: "npm uninstall -g @openai/codex".to_string(),
            docs_url: "https://github.com/openai/codex".to_string(),
            config_paths: find_config_files("codex"),
        }),
        check_tool(AiCliTool {
            id: "opencode".to_string(),
            name: "OpenCode".to_string(),
            description: "Terminal-based AI coding assistant with multi-provider support"
                .to_string(),
            installed: false,
            version: None,
            install_command: "npm install -g opencode".to_string(),
            update_command: "npm update -g opencode".to_string(),
            uninstall_command: "npm uninstall -g opencode".to_string(),
            docs_url: "https://github.com/opencode-ai/opencode".to_string(),
            config_paths: find_config_files("opencode"),
        }),
        check_tool(AiCliTool {
            id: "gemini".to_string(),
            name: "Gemini CLI".to_string(),
            description: "Google's Gemini AI coding assistant".to_string(),
            installed: false,
            version: None,
            install_command: "npm install -g @google/gemini-cli".to_string(),
            update_command: "npm update -g @google/gemini-cli".to_string(),
            uninstall_command: "npm uninstall -g @google/gemini-cli".to_string(),
            docs_url: "https://ai.google.dev/gemini-api/docs".to_string(),
            config_paths: find_config_files("gemini"),
        }),
        check_tool(AiCliTool {
            id: "aider".to_string(),
            name: "Aider".to_string(),
            description: "AI pair programming in your terminal".to_string(),
            installed: false,
            version: None,
            install_command: "pipx install aider-chat".to_string(),
            update_command: "pipx upgrade aider-chat".to_string(),
            uninstall_command: "pipx uninstall aider-chat".to_string(),
            docs_url: "https://aider.chat".to_string(),
            config_paths: find_config_files("aider"),
        }),
        check_tool(AiCliTool {
            id: "continue".to_string(),
            name: "Continue".to_string(),
            description: "Open-source AI code assistant".to_string(),
            installed: false,
            version: None,
            install_command: "npm install -g continue".to_string(),
            update_command: "npm update -g continue".to_string(),
            uninstall_command: "npm uninstall -g continue".to_string(),
            docs_url: "https://continue.dev".to_string(),
            config_paths: find_config_files("continue"),
        }),
        check_tool(AiCliTool {
            id: "cody".to_string(),
            name: "Sourcegraph Cody".to_string(),
            description: "Sourcegraph's AI coding assistant".to_string(),
            installed: false,
            version: None,
            install_command: "npm install -g @sourcegraph/cody".to_string(),
            update_command: "npm update -g @sourcegraph/cody".to_string(),
            uninstall_command: "npm uninstall -g @sourcegraph/cody".to_string(),
            docs_url: "https://sourcegraph.com/cody".to_string(),
            config_paths: find_config_files("cody"),
        }),
        check_tool(AiCliTool {
            id: "cursor".to_string(),
            name: "Cursor CLI".to_string(),
            description: "Cursor AI editor command line interface".to_string(),
            installed: false,
            version: None,
            install_command: "Download from https://cursor.sh".to_string(),
            update_command: "cursor --update".to_string(),
            uninstall_command: "Manual uninstall required".to_string(),
            docs_url: "https://cursor.sh".to_string(),
            config_paths: find_config_files("cursor"),
        }),
    ]
}

/// Configuration discovery patterns for AI CLI tools
/// Uses dynamic scanning instead of hardcoded file names to adapt to frequent config format changes
struct ConfigDiscovery {
    /// Directories to scan for config files (relative to home)
    directories: Vec<&'static str>,
    /// Single files to check (relative to home) - for tools using dotfiles
    single_files: Vec<&'static str>,
    /// File extensions to consider as config files when scanning directories
    config_extensions: Vec<&'static str>,
}

impl ConfigDiscovery {
    fn for_tool(tool_id: &str) -> Self {
        match tool_id {
            "claude" => ConfigDiscovery {
                directories: vec![".claude"],
                single_files: vec![".claude.json"],
                config_extensions: vec!["json", "toml", "yaml", "yml"],
            },
            "codex" => ConfigDiscovery {
                directories: vec![".codex"],
                single_files: vec![".codexrc"],
                config_extensions: vec!["json", "toml", "yaml", "yml"],
            },
            "opencode" => ConfigDiscovery {
                directories: vec![".opencode"],
                single_files: vec![".opencoderc"],
                config_extensions: vec!["json", "toml", "yaml", "yml"],
            },
            "gemini" => ConfigDiscovery {
                directories: vec![".gemini"],
                single_files: vec![".geminirc"],
                config_extensions: vec!["json", "toml", "yaml", "yml"],
            },
            "aider" => ConfigDiscovery {
                directories: vec![".aider"],
                single_files: vec![
                    ".aider.conf.yml",
                    ".aider.model.settings.yml",
                    ".aider.model.metadata.json",
                ],
                config_extensions: vec!["json", "toml", "yaml", "yml"],
            },
            "continue" => ConfigDiscovery {
                directories: vec![".continue"],
                single_files: vec![],
                config_extensions: vec!["json", "yaml", "yml"],
            },
            "cody" => ConfigDiscovery {
                directories: vec![".sourcegraph"],
                single_files: vec![],
                config_extensions: vec!["json"],
            },
            "cursor" => ConfigDiscovery {
                directories: vec![".cursor"],
                single_files: vec![".cursorignore", ".cursorrules"],
                config_extensions: vec!["json", "yaml", "yml"],
            },
            _ => ConfigDiscovery {
                directories: vec![],
                single_files: vec![],
                config_extensions: vec![],
            },
        }
    }
}

/// Find config files for an AI CLI tool using dynamic scanning
fn find_config_files(tool_id: &str) -> Vec<AiConfigFile> {
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_default();
    let app_data = env::var("APPDATA").unwrap_or_default();
    let local_app_data = env::var("LOCALAPPDATA").unwrap_or_default();

    let discovery = ConfigDiscovery::for_tool(tool_id);
    let mut configs = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    let base_dirs = [
        (&home, ""),
        (&app_data, " (AppData)"),
        (&local_app_data, " (Local)"),
    ];

    for (base, suffix) in &base_dirs {
        if base.is_empty() {
            continue;
        }

        // Scan directories for config files
        for dir_name in &discovery.directories {
            let dir_path = PathBuf::from(base).join(dir_name);
            if dir_path.is_dir() {
                // Add the directory itself
                let dir_str = dir_path.to_string_lossy().to_string();
                if seen_paths.insert(dir_str.clone()) {
                    configs.push(AiConfigFile {
                        name: format!("{} Directory{}", capitalize_tool_id(tool_id), suffix),
                        path: dir_str,
                        exists: true,
                    });
                }

                // Scan for config files in the directory (non-recursive, only top-level)
                if let Ok(entries) = std::fs::read_dir(&dir_path) {
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        if path.is_file() {
                            let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                            let ext = path.extension().unwrap_or_default().to_string_lossy();

                            // Check if it's a config file by extension
                            let is_config = discovery.config_extensions.iter().any(|e| *e == ext)
                                || file_name.ends_with("rc")
                                || file_name.starts_with("config")
                                || file_name.starts_with("settings")
                                || file_name.ends_with(".conf");

                            if is_config {
                                let path_str = path.to_string_lossy().to_string();
                                if seen_paths.insert(path_str.clone()) {
                                    configs.push(AiConfigFile {
                                        name: format!("{}{}", file_name, suffix),
                                        path: path_str,
                                        exists: true,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        // Check single files
        for file_name in &discovery.single_files {
            let file_path = PathBuf::from(base).join(file_name);
            let path_str = file_path.to_string_lossy().to_string();
            if seen_paths.insert(path_str.clone()) {
                configs.push(AiConfigFile {
                    name: format!("{}{}", file_name, suffix),
                    path: path_str.clone(),
                    exists: file_path.exists(),
                });
            }
        }
    }

    // Sort: existing files first, then by name
    configs.sort_by(|a, b| match (a.exists, b.exists) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    configs
}

/// Capitalize tool ID for display
fn capitalize_tool_id(tool_id: &str) -> String {
    let mut chars = tool_id.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Check if a tool is installed and get its version
fn check_tool(mut tool: AiCliTool) -> AiCliTool {
    let (cmd, args) = match tool.id.as_str() {
        "claude" => ("claude", vec!["--version"]),
        "codex" => ("codex", vec!["--version"]),
        "opencode" => ("opencode", vec!["--version"]),
        "gemini" => ("gemini", vec!["--version"]),
        "aider" => ("aider", vec!["--version"]),
        "continue" => ("continue", vec!["--version"]),
        "cody" => ("cody", vec!["--version"]),
        "cursor" => ("cursor", vec!["--version"]),
        _ => return tool,
    };

    if let Some(version) = run_command_get_version(cmd, &args) {
        tool.installed = true;
        tool.version = Some(version);
    }

    tool
}

/// Run a command and extract version
fn run_command_get_version(cmd: &str, args: &[&str]) -> Option<String> {
    // On Windows, .cmd files (npm scripts) need to be run through cmd /c
    #[cfg(target_os = "windows")]
    let output = {
        let full_cmd = format!("{} {}", cmd, args.join(" "));
        let cmd_args = ["/C", full_cmd.as_str()];
        command_output_with_timeout("cmd", &cmd_args, Duration::from_secs(6)).ok()?
    };

    #[cfg(not(target_os = "windows"))]
    let output = command_output_with_timeout(cmd, args, Duration::from_secs(6)).ok()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr);

        // Extract version number
        let version = combined
            .lines()
            .next()
            .map(|l| l.trim().to_string())
            .unwrap_or_default();

        if !version.is_empty() {
            return Some(version);
        }
    }

    None
}

/// Install an AI CLI tool
pub fn install_ai_tool(tool_id: &str) -> Result<String, String> {
    let tools = get_ai_cli_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Tool not found: {}", tool_id))?;

    if tool.install_command.starts_with("Download") {
        return Err(format!(
            "{} requires manual installation. Visit: {}",
            tool.name, tool.docs_url
        ));
    }

    run_install_command(&tool.install_command)
}

/// Update an AI CLI tool
pub fn update_ai_tool(tool_id: &str) -> Result<String, String> {
    let tools = get_ai_cli_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Tool not found: {}", tool_id))?;

    run_install_command(&tool.update_command)
}

/// Uninstall an AI CLI tool
pub fn uninstall_ai_tool(tool_id: &str) -> Result<String, String> {
    let tools = get_ai_cli_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Tool not found: {}", tool_id))?;

    if tool.uninstall_command.contains("Manual") {
        return Err(format!("{} requires manual uninstallation", tool.name));
    }

    run_install_command(&tool.uninstall_command)
}

/// Run an installation command
fn run_install_command(command: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let output = command_no_window("cmd").args(["/C", command]).output();

    #[cfg(not(target_os = "windows"))]
    let output = command_no_window("sh").args(["-c", command]).output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                Ok(format!("Success!\n{}{}", stdout, stderr))
            } else {
                Err(format!("Command failed:\n{}{}", stdout, stderr))
            }
        }
        Err(e) => Err(format!("Failed to run command: {}", e)),
    }
}
