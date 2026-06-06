//! AI CLI Tools management module for Dev Janitor v2
//! Manage AI coding assistant CLI tools

use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::time::Duration;

use crate::ai_tools::{ai_tools, find_ai_tool, normalize_ai_tool_id, AiToolMetadata};
use crate::utils::command::{command_output_with_timeout, command_output_with_timeout_vec};

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

struct ToolLifecycleCommands {
    install: String,
    update: String,
    uninstall: String,
}

fn lifecycle_commands(tool_id: &str) -> ToolLifecycleCommands {
    match tool_id {
        "claude" => ToolLifecycleCommands {
            install: "npm install -g @anthropic-ai/claude-code".to_string(),
            update: "npm install -g @anthropic-ai/claude-code@latest".to_string(),
            uninstall: "npm uninstall -g @anthropic-ai/claude-code".to_string(),
        },
        "codex" => ToolLifecycleCommands {
            install: "npm i -g @openai/codex".to_string(),
            update: "codex update || npm install -g @openai/codex@latest".to_string(),
            uninstall: "npm uninstall -g @openai/codex".to_string(),
        },
        "opencode" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "npm install -g opencode-ai".to_string()
            } else {
                "curl -fsSL https://opencode.ai/install | bash".to_string()
            },
            update: "npm install -g opencode-ai@latest".to_string(),
            uninstall: "npm uninstall -g opencode-ai".to_string(),
        },
        "goose" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "Manual install from Goose CLI docs".to_string()
            } else {
                "curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash".to_string()
            },
            update: "goose update".to_string(),
            uninstall: "Manual uninstall from Goose CLI docs".to_string(),
        },
        "openhands" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "WSL required: uv tool install openhands --python 3.12".to_string()
            } else {
                "uv tool install openhands --python 3.12".to_string()
            },
            update: if cfg!(target_os = "windows") {
                "WSL required: uv tool upgrade openhands --python 3.12".to_string()
            } else {
                "uv tool upgrade openhands --python 3.12".to_string()
            },
            uninstall: if cfg!(target_os = "windows") {
                "WSL required: uv tool uninstall openhands".to_string()
            } else {
                "uv tool uninstall openhands".to_string()
            },
        },
        "auggie" => ToolLifecycleCommands {
            install: "npm install -g @augmentcode/auggie".to_string(),
            update: "auggie upgrade --skip-confirmation".to_string(),
            uninstall: "npm uninstall -g @augmentcode/auggie".to_string(),
        },
        "kilo" => ToolLifecycleCommands {
            install: "npm install -g @kilocode/cli".to_string(),
            update: "kilo upgrade".to_string(),
            uninstall: "kilo uninstall".to_string(),
        },
        "junie" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "powershell -NoProfile -ExecutionPolicy Bypass -Command \"iex (irm 'https://junie.jetbrains.com/install.ps1')\"".to_string()
            } else {
                "curl -fsSL https://junie.jetbrains.com/install.sh | bash".to_string()
            },
            update: "Manual update from Junie CLI docs".to_string(),
            uninstall: "Manual uninstall from Junie CLI docs".to_string(),
        },
        "gemini" => ToolLifecycleCommands {
            install: "npm install -g @google/gemini-cli".to_string(),
            update: "npm install -g @google/gemini-cli@latest".to_string(),
            uninstall: "npm uninstall -g @google/gemini-cli".to_string(),
        },
        "aider" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "powershell -ExecutionPolicy ByPass -c \"irm https://aider.chat/install.ps1 | iex\""
                    .to_string()
            } else {
                "curl -LsSf https://aider.chat/install.sh | sh".to_string()
            },
            update: "aider --upgrade".to_string(),
            uninstall: "uv tool uninstall aider-chat || pipx uninstall aider-chat".to_string(),
        },
        "continue" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "npm install -g @continuedev/cli".to_string()
            } else {
                "curl -fsSL https://raw.githubusercontent.com/continuedev/continue/main/extensions/cli/scripts/install.sh | bash".to_string()
            },
            update: "npm install -g @continuedev/cli@latest".to_string(),
            uninstall: "npm uninstall -g @continuedev/cli".to_string(),
        },
        "cody" => ToolLifecycleCommands {
            install: "npm install -g @sourcegraph/cody @sourcegraph/cody-agent".to_string(),
            update: "npm install -g @sourcegraph/cody@latest @sourcegraph/cody-agent@latest"
                .to_string(),
            uninstall: "npm uninstall -g @sourcegraph/cody @sourcegraph/cody-agent".to_string(),
        },
        "cursor" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "powershell -ExecutionPolicy ByPass -c \"irm https://cursor.com/install | iex\""
                    .to_string()
            } else {
                "curl -fsS https://cursor.com/install | bash".to_string()
            },
            update: "cursor-agent upgrade".to_string(),
            uninstall: "Manual uninstall required".to_string(),
        },
        "kiro" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "powershell -ExecutionPolicy ByPass -c \"irm https://kiro.dev/install.ps1 | iex\""
                    .to_string()
            } else {
                "curl -fsSL https://kiro.dev/install | bash".to_string()
            },
            update: "kiro-cli update --non-interactive".to_string(),
            uninstall: "kiro-cli uninstall".to_string(),
        },
        "iflow" => ToolLifecycleCommands {
            install: "npm install -g @iflow-ai/iflow-cli".to_string(),
            update: "npm install -g @iflow-ai/iflow-cli@latest".to_string(),
            uninstall: "npm uninstall -g @iflow-ai/iflow-cli".to_string(),
        },
        "copilot" => ToolLifecycleCommands {
            install: "npm install -g @github/copilot".to_string(),
            update: "npm install -g @github/copilot@latest".to_string(),
            uninstall: "npm uninstall -g @github/copilot".to_string(),
        },
        "qwen" => ToolLifecycleCommands {
            install: "npm install -g @qwen-code/qwen-code".to_string(),
            update: "npm install -g @qwen-code/qwen-code@latest".to_string(),
            uninstall: "npm uninstall -g @qwen-code/qwen-code".to_string(),
        },
        "cline" => ToolLifecycleCommands {
            install: "npm install -g cline".to_string(),
            update: "npm install -g cline@latest".to_string(),
            uninstall: "npm uninstall -g cline".to_string(),
        },
        "amp" => ToolLifecycleCommands {
            install: if cfg!(target_os = "windows") {
                "powershell -ExecutionPolicy ByPass -c \"irm https://ampcode.com/install.ps1 | iex\""
                    .to_string()
            } else {
                "curl -fsSL https://ampcode.com/install.sh | bash".to_string()
            },
            update: "amp update || npm install -g @ampcode/cli@latest".to_string(),
            uninstall: "npm uninstall -g @ampcode/cli".to_string(),
        },
        "crush" => ToolLifecycleCommands {
            install: "npm install -g @charmland/crush".to_string(),
            update: "npm install -g @charmland/crush@latest".to_string(),
            uninstall: "npm uninstall -g @charmland/crush".to_string(),
        },
        "amazonq" => ToolLifecycleCommands {
            install: "Manual install from Amazon Q Developer CLI docs".to_string(),
            update: "Manual update from Amazon Q Developer CLI docs".to_string(),
            uninstall: "Manual uninstall from Amazon Q Developer CLI docs".to_string(),
        },
        _ => ToolLifecycleCommands {
            install: "Unsupported".to_string(),
            update: "Unsupported".to_string(),
            uninstall: "Unsupported".to_string(),
        },
    }
}

/// Get all supported AI CLI tools with their status
pub fn get_ai_cli_tools() -> Vec<AiCliTool> {
    ai_tools()
        .iter()
        .map(|metadata| {
            let commands = lifecycle_commands(metadata.id);
            check_tool(AiCliTool {
                id: metadata.id.to_string(),
                name: metadata.name.to_string(),
                description: metadata.description.to_string(),
                installed: false,
                version: None,
                install_command: commands.install,
                update_command: commands.update,
                uninstall_command: commands.uninstall,
                docs_url: metadata.docs_url.to_string(),
                config_paths: find_config_files(metadata.id),
            })
        })
        .collect()
}

/// Configuration discovery patterns for AI CLI tools
/// Uses dynamic scanning instead of hardcoded file names to adapt to frequent config format changes
struct ConfigDiscovery<'a> {
    /// Directories to scan for config files (relative to home)
    directories: &'a [&'static str],
    /// Single files to check (relative to home) - for tools using dotfiles
    single_files: &'a [&'static str],
    /// File extensions to consider as config files when scanning directories
    config_extensions: &'a [&'static str],
}

impl<'a> From<&'a AiToolMetadata> for ConfigDiscovery<'a> {
    fn from(metadata: &'a AiToolMetadata) -> Self {
        Self {
            directories: metadata.config_directories,
            single_files: metadata.config_files,
            config_extensions: metadata.config_extensions,
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

    let Some(metadata) = find_ai_tool(tool_id) else {
        return Vec::new();
    };
    let discovery = ConfigDiscovery::from(metadata);
    let display_name = metadata.name;
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
        for dir_name in discovery.directories {
            let dir_path = PathBuf::from(base).join(dir_name);
            if dir_path.is_dir() {
                // Add the directory itself
                let dir_str = dir_path.to_string_lossy().to_string();
                if seen_paths.insert(dir_str.clone()) {
                    configs.push(AiConfigFile {
                        name: format!("{} Directory{}", display_name, suffix),
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
        for file_name in discovery.single_files {
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

fn is_manual_action(command: &str) -> bool {
    let normalized = command.trim().to_ascii_lowercase();
    normalized.starts_with("download")
        || normalized.starts_with("manual")
        || normalized.starts_with("unsupported")
        || normalized.starts_with("visit")
        || normalized.starts_with("wsl required")
        || normalized.starts_with("remove ")
}

/// Check if a tool is installed and get its version
fn check_tool(mut tool: AiCliTool) -> AiCliTool {
    let attempts = version_probe_attempts(&tool.id);
    for (cmd, args) in attempts {
        if let Some(output) = run_command_capture(cmd, args) {
            tool.installed = true;
            tool.version = extract_semver_like(&output);
            break;
        }
    }

    tool
}

fn version_probe_attempts(tool_id: &str) -> Vec<(&'static str, &'static [&'static str])> {
    match tool_id {
        "continue" => vec![("cn", &["--version"]), ("continue", &["--version"])],
        "cursor" => vec![("cursor-agent", &["--version"]), ("cursor", &["--version"])],
        "cody" => vec![
            ("cody", &["--version"]),
            ("cody", &["help"]),
            ("cody-agent", &["--version"]),
            ("cody-agent", &["help"]),
        ],
        "kiro" => vec![("kiro-cli", &["version"]), ("kiro", &["version"])],
        "iflow" => vec![("iflow", &["--version"])],
        "amazonq" => vec![("q", &["--version"])],
        other => find_ai_tool(other)
            .map(|tool| {
                tool.commands
                    .iter()
                    .map(|cmd| (*cmd, tool.version_args))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default(),
    }
}

fn run_command_capture(cmd: &str, args: &[&str]) -> Option<String> {
    let output = command_output_with_timeout(cmd, args, Duration::from_secs(6)).ok()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr).trim().to_string();
        if !combined.is_empty() {
            return Some(combined);
        }
    }

    None
}

fn extract_semver_like(output: &str) -> Option<String> {
    let re = regex::Regex::new(r"(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z\.-]+)?)").ok()?;
    re.captures(output)
        .and_then(|captures| captures.get(1))
        .map(|version| version.as_str().to_string())
}

/// Install an AI CLI tool
pub fn install_ai_tool(tool_id: &str) -> Result<String, String> {
    let tool_id =
        normalize_ai_tool_id(tool_id).ok_or_else(|| format!("Tool not found: {}", tool_id))?;
    let tools = get_ai_cli_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Tool not found: {}", tool_id))?;

    if is_manual_action(&tool.install_command) {
        return Err(format!(
            "{} requires manual installation. Visit: {}",
            tool.name, tool.docs_url
        ));
    }

    execute_tool_action(tool_id, ToolAction::Install)
}

/// Update an AI CLI tool
pub fn update_ai_tool(tool_id: &str) -> Result<String, String> {
    let tool_id =
        normalize_ai_tool_id(tool_id).ok_or_else(|| format!("Tool not found: {}", tool_id))?;
    let tools = get_ai_cli_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Tool not found: {}", tool_id))?;

    if is_manual_action(&tool.update_command) {
        return Err(format!(
            "{} requires manual update. Visit: {}",
            tool.name, tool.docs_url
        ));
    }

    execute_tool_action(tool_id, ToolAction::Update)
}

/// Uninstall an AI CLI tool
pub fn uninstall_ai_tool(tool_id: &str) -> Result<String, String> {
    let tool_id =
        normalize_ai_tool_id(tool_id).ok_or_else(|| format!("Tool not found: {}", tool_id))?;
    let tools = get_ai_cli_tools();
    let tool = tools
        .iter()
        .find(|t| t.id == tool_id)
        .ok_or_else(|| format!("Tool not found: {}", tool_id))?;

    if is_manual_action(&tool.uninstall_command) {
        return Err(format!(
            "{} requires manual uninstallation. Visit: {}",
            tool.name, tool.docs_url
        ));
    }

    execute_tool_action(tool_id, ToolAction::Uninstall)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_manual_actions() {
        assert!(is_manual_action("Download from vendor site"));
        assert!(is_manual_action("Manual uninstall required"));
        assert!(is_manual_action("Unsupported on this platform"));
        assert!(is_manual_action(
            "Manual install from Amazon Q Developer CLI docs"
        ));
        assert!(!is_manual_action("npm install -g @openai/codex"));
    }

    #[test]
    fn exposes_new_tool_commands() {
        let iflow = lifecycle_commands("iflow");
        assert!(iflow.install.contains("@iflow-ai/iflow-cli"));

        let kiro = lifecycle_commands("kiro");
        assert!(kiro.update.contains("kiro-cli update"));

        let claude = lifecycle_commands("claude");
        assert!(claude.install.contains("@anthropic-ai/claude-code"));

        let cody = lifecycle_commands("cody");
        assert!(cody.install.contains("@sourcegraph/cody-agent"));

        let goose = lifecycle_commands("goose");
        assert!(goose.install.contains("download_cli.sh"));
        assert_eq!(goose.update, "goose update");
        assert!(is_manual_action(&goose.uninstall));

        let openhands = lifecycle_commands("openhands");
        assert!(openhands.install.contains("uv tool install openhands"));
        assert!(openhands.update.contains("uv tool upgrade openhands"));
        assert!(openhands.uninstall.contains("uv tool uninstall openhands"));

        let auggie = lifecycle_commands("auggie");
        assert!(auggie.install.contains("@augmentcode/auggie"));
        assert_eq!(auggie.update, "auggie upgrade --skip-confirmation");

        let kilo = lifecycle_commands("kilo");
        assert!(kilo.install.contains("@kilocode/cli"));
        assert_eq!(kilo.update, "kilo upgrade");
        assert_eq!(kilo.uninstall, "kilo uninstall");

        let junie = lifecycle_commands("junie");
        assert!(junie.install.contains("junie.jetbrains.com/install"));
        assert!(is_manual_action(&junie.update));
        assert!(is_manual_action(&junie.uninstall));

        let copilot = lifecycle_commands("copilot");
        assert!(copilot.install.contains("@github/copilot"));

        let cline = lifecycle_commands("cline");
        assert_eq!(cline.install, "npm install -g cline");

        let amp = lifecycle_commands("amp");
        assert!(amp.install.contains("ampcode.com/install"));
        assert!(amp.update.contains("@ampcode/cli@latest"));
    }
}

/// Run an installation/update/uninstall command (with 300s timeout)
#[derive(Clone, Copy)]
enum ToolAction {
    Install,
    Update,
    Uninstall,
}

fn execute_tool_action(tool_id: &str, action: ToolAction) -> Result<String, String> {
    match (tool_id, action) {
        ("claude", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@anthropic-ai/claude-code"])
        }
        ("claude", ToolAction::Update) => run_command(
            "npm",
            &["install", "-g", "@anthropic-ai/claude-code@latest"],
        ),
        ("claude", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@anthropic-ai/claude-code"])
        }
        ("codex", ToolAction::Install) => run_command("npm", &["i", "-g", "@openai/codex"]),
        ("codex", ToolAction::Update) => run_first_success(&[
            ("codex", vec!["update".to_string()]),
            (
                "npm",
                vec![
                    "install".to_string(),
                    "-g".to_string(),
                    "@openai/codex@latest".to_string(),
                ],
            ),
        ]),
        ("codex", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@openai/codex"])
        }
        ("opencode", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_command("npm", &["install", "-g", "opencode-ai"])
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command("curl -fsSL https://opencode.ai/install | bash")
            }
        }
        ("opencode", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "opencode-ai@latest"])
        }
        ("opencode", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "opencode-ai"])
        }
        ("goose", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                Err("Goose CLI requires manual installation on Windows".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command(
                    "curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash",
                )
            }
        }
        ("goose", ToolAction::Update) => run_command("goose", &["update"]),
        ("goose", ToolAction::Uninstall) => {
            Err("Goose CLI requires manual uninstallation".to_string())
        }
        ("openhands", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                Err("OpenHands CLI installation should be run inside WSL".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_command("uv", &["tool", "install", "openhands", "--python", "3.12"])
            }
        }
        ("openhands", ToolAction::Update) => {
            #[cfg(target_os = "windows")]
            {
                Err("OpenHands CLI update should be run inside WSL".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_command("uv", &["tool", "upgrade", "openhands", "--python", "3.12"])
            }
        }
        ("openhands", ToolAction::Uninstall) => {
            #[cfg(target_os = "windows")]
            {
                Err("OpenHands CLI uninstallation should be run inside WSL".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_command("uv", &["tool", "uninstall", "openhands"])
            }
        }
        ("auggie", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@augmentcode/auggie"])
        }
        ("auggie", ToolAction::Update) => {
            run_command("auggie", &["upgrade", "--skip-confirmation"])
        }
        ("auggie", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@augmentcode/auggie"])
        }
        ("kilo", ToolAction::Install) => run_command("npm", &["install", "-g", "@kilocode/cli"]),
        ("kilo", ToolAction::Update) => run_command("kilo", &["upgrade"]),
        ("kilo", ToolAction::Uninstall) => run_command("kilo", &["uninstall"]),
        ("junie", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_owned_command(
                    "powershell",
                    &[
                        "-NoProfile".to_string(),
                        "-ExecutionPolicy".to_string(),
                        "Bypass".to_string(),
                        "-Command".to_string(),
                        "iex (irm 'https://junie.jetbrains.com/install.ps1')".to_string(),
                    ],
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command("curl -fsSL https://junie.jetbrains.com/install.sh | bash")
            }
        }
        ("junie", ToolAction::Update) => Err("Junie CLI requires manual update".to_string()),
        ("junie", ToolAction::Uninstall) => {
            Err("Junie CLI requires manual uninstallation".to_string())
        }
        ("gemini", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@google/gemini-cli"])
        }
        ("gemini", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "@google/gemini-cli@latest"])
        }
        ("gemini", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@google/gemini-cli"])
        }
        ("aider", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_owned_command(
                    "powershell",
                    &[
                        "-ExecutionPolicy".to_string(),
                        "ByPass".to_string(),
                        "-c".to_string(),
                        "irm https://aider.chat/install.ps1 | iex".to_string(),
                    ],
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command("curl -LsSf https://aider.chat/install.sh | sh")
            }
        }
        ("aider", ToolAction::Update) => run_command("aider", &["--upgrade"]),
        ("aider", ToolAction::Uninstall) => run_first_success(&[
            (
                "uv",
                vec![
                    "tool".to_string(),
                    "uninstall".to_string(),
                    "aider-chat".to_string(),
                ],
            ),
            (
                "pipx",
                vec!["uninstall".to_string(), "aider-chat".to_string()],
            ),
        ]),
        ("continue", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_command("npm", &["install", "-g", "@continuedev/cli"])
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command(
                    "curl -fsSL https://raw.githubusercontent.com/continuedev/continue/main/extensions/cli/scripts/install.sh | bash",
                )
            }
        }
        ("continue", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "@continuedev/cli@latest"])
        }
        ("continue", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@continuedev/cli"])
        }
        ("cody", ToolAction::Install) => run_command(
            "npm",
            &[
                "install",
                "-g",
                "@sourcegraph/cody",
                "@sourcegraph/cody-agent",
            ],
        ),
        ("cody", ToolAction::Update) => run_command(
            "npm",
            &[
                "install",
                "-g",
                "@sourcegraph/cody@latest",
                "@sourcegraph/cody-agent@latest",
            ],
        ),
        ("cody", ToolAction::Uninstall) => run_command(
            "npm",
            &[
                "uninstall",
                "-g",
                "@sourcegraph/cody",
                "@sourcegraph/cody-agent",
            ],
        ),
        ("kiro", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_owned_command(
                    "powershell",
                    &[
                        "-ExecutionPolicy".to_string(),
                        "ByPass".to_string(),
                        "-c".to_string(),
                        "irm https://kiro.dev/install.ps1 | iex".to_string(),
                    ],
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command("curl -fsSL https://kiro.dev/install | bash")
            }
        }
        ("kiro", ToolAction::Update) => run_first_success(&[
            (
                "kiro-cli",
                vec!["update".to_string(), "--non-interactive".to_string()],
            ),
            (
                "kiro",
                vec!["update".to_string(), "--non-interactive".to_string()],
            ),
        ]),
        ("kiro", ToolAction::Uninstall) => run_first_success(&[
            ("kiro-cli", vec!["uninstall".to_string()]),
            ("kiro", vec!["uninstall".to_string()]),
        ]),
        ("cursor", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_owned_command(
                    "powershell",
                    &[
                        "-ExecutionPolicy".to_string(),
                        "ByPass".to_string(),
                        "-c".to_string(),
                        "irm https://cursor.com/install | iex".to_string(),
                    ],
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command("curl -fsS https://cursor.com/install | bash")
            }
        }
        ("cursor", ToolAction::Update) => run_first_success(&[
            ("cursor-agent", vec!["upgrade".to_string()]),
            ("cursor-agent", vec!["update".to_string()]),
        ]),
        ("cursor", ToolAction::Uninstall) => Err("Cursor CLI 需要手动卸载".to_string()),
        ("iflow", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@iflow-ai/iflow-cli"])
        }
        ("iflow", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "@iflow-ai/iflow-cli@latest"])
        }
        ("iflow", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@iflow-ai/iflow-cli"])
        }
        ("copilot", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@github/copilot"])
        }
        ("copilot", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "@github/copilot@latest"])
        }
        ("copilot", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@github/copilot"])
        }
        ("qwen", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@qwen-code/qwen-code"])
        }
        ("qwen", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "@qwen-code/qwen-code@latest"])
        }
        ("qwen", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@qwen-code/qwen-code"])
        }
        ("cline", ToolAction::Install) => run_command("npm", &["install", "-g", "cline"]),
        ("cline", ToolAction::Update) => run_command("npm", &["install", "-g", "cline@latest"]),
        ("cline", ToolAction::Uninstall) => run_command("npm", &["uninstall", "-g", "cline"]),
        ("amp", ToolAction::Install) => {
            #[cfg(target_os = "windows")]
            {
                run_owned_command(
                    "powershell",
                    &[
                        "-ExecutionPolicy".to_string(),
                        "ByPass".to_string(),
                        "-c".to_string(),
                        "irm https://ampcode.com/install.ps1 | iex".to_string(),
                    ],
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                run_shell_command("curl -fsSL https://ampcode.com/install.sh | bash")
            }
        }
        ("amp", ToolAction::Update) => run_first_success(&[
            ("amp", vec!["update".to_string()]),
            (
                "npm",
                vec![
                    "install".to_string(),
                    "-g".to_string(),
                    "@ampcode/cli@latest".to_string(),
                ],
            ),
        ]),
        ("amp", ToolAction::Uninstall) => run_command("npm", &["uninstall", "-g", "@ampcode/cli"]),
        ("crush", ToolAction::Install) => {
            run_command("npm", &["install", "-g", "@charmland/crush"])
        }
        ("crush", ToolAction::Update) => {
            run_command("npm", &["install", "-g", "@charmland/crush@latest"])
        }
        ("crush", ToolAction::Uninstall) => {
            run_command("npm", &["uninstall", "-g", "@charmland/crush"])
        }
        _ => Err(format!("Unsupported action for tool: {}", tool_id)),
    }
}

fn run_command(program: &str, args: &[&str]) -> Result<String, String> {
    match command_output_with_timeout(program, args, Duration::from_secs(300)) {
        Ok(output) => format_command_result(program, &args.join(" "), output),
        Err(error) => Err(format!("Failed to run command: {}", error)),
    }
}

fn run_owned_command(program: &str, args: &[String]) -> Result<String, String> {
    match command_output_with_timeout_vec(program, args, Duration::from_secs(300)) {
        Ok(output) => format_command_result(program, &args.join(" "), output),
        Err(error) => Err(format!("Failed to run command: {}", error)),
    }
}

fn run_shell_command(script: &str) -> Result<String, String> {
    run_owned_command("sh", &["-c".to_string(), script.to_string()])
}

fn run_first_success(attempts: &[(&str, Vec<String>)]) -> Result<String, String> {
    let mut last_error = None;

    for (program, args) in attempts {
        match run_owned_command(program, args) {
            Ok(result) => return Ok(result),
            Err(error) => last_error = Some(error),
        }
    }

    Err(last_error.unwrap_or_else(|| "No command attempts were provided".to_string()))
}

fn format_command_result(
    program: &str,
    joined_args: &str,
    output: std::process::Output,
) -> Result<String, String> {
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr).trim().to_string();

    if output.status.success() {
        if combined.is_empty() {
            Ok(format!("Success: {} {}", program, joined_args))
        } else {
            Ok(format!("Success!\n{}", combined))
        }
    } else if combined.is_empty() {
        Err(format!("Command failed: {} {}", program, joined_args))
    } else {
        Err(format!("Command failed:\n{}", combined))
    }
}
