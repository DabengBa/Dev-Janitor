//! Chat History Management module for Dev Janitor v2
//! Manages AI coding assistant chat histories and related debug files
//! Implements Issue #35: https://github.com/cocojojo5213/Dev-Janitor/issues/35

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

const SKIPPED_SCAN_DIRECTORIES: &[&str] = &[
    "node_modules",
    ".git",
    ".svn",
    "target",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    "vendor",
];

const GLOBAL_CHAT_HISTORY_PATTERNS: &[(&str, &str)] = &[
    (".claude", "Claude Code"),
    (".codex", "OpenAI Codex"),
    (".opencode", "OpenCode"),
    (".copilot/session-state", "GitHub Copilot CLI"),
    (".copilot/session-store.db", "GitHub Copilot CLI"),
    (".config/goose/history.txt", "Goose CLI"),
    (".local/share/goose/sessions", "Goose CLI"),
    (".local/state/goose/logs", "Goose CLI"),
    (".openhands/conversations", "OpenHands CLI"),
    (".gemini", "Gemini CLI"),
    (".aider", "Aider"),
    (".cursor", "Cursor"),
    (".continue", "Continue"),
    (".sourcegraph", "Cody"),
    (".codeium", "Codeium"),
    (".windsurf", "Windsurf"),
    (".amazonq", "Amazon Q"),
    (".kiro", "Kiro CLI"),
    (".iflow", "iFlow CLI"),
    (".qwen", "Qwen Code"),
    (".cline", "Cline"),
    (".amp", "Amp"),
    (".crush", "Crush"),
];

/// Represents a project with AI chat history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectChatHistory {
    /// Unique identifier for the project
    pub id: String,
    /// Project name (directory name or detected project name)
    pub name: String,
    /// Project root path
    pub project_path: String,
    /// List of chat history files/folders found
    pub chat_files: Vec<ChatHistoryFile>,
    /// Total size of all chat history files
    pub total_size: u64,
    /// Human-readable total size
    pub total_size_display: String,
    /// AI tools detected in this project
    pub ai_tools_detected: Vec<String>,
}

/// Represents a single chat history file or directory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatHistoryFile {
    /// Unique identifier
    pub id: String,
    /// File or directory name
    pub name: String,
    /// Full path
    pub path: String,
    /// Size in bytes
    pub size: u64,
    /// Human-readable size
    pub size_display: String,
    /// AI tool that created this file
    pub ai_tool: String,
    /// Type of file (chat_history, debug, cache, context)
    pub file_type: String,
    /// Whether this is a directory
    pub is_directory: bool,
}

/// Chat history patterns for different AI tools
struct ChatHistoryPattern {
    /// AI tool name
    tool: &'static str,
    /// Patterns to match (file/folder names or paths)
    patterns: Vec<&'static str>,
    /// File type classification
    file_type: &'static str,
}

/// Get all chat history patterns for AI tools
fn get_chat_history_patterns() -> Vec<ChatHistoryPattern> {
    vec![
        // Claude Code
        ChatHistoryPattern {
            tool: "Claude Code",
            patterns: vec!["claude_output"],
            file_type: "chat_history",
        },
        // Aider
        ChatHistoryPattern {
            tool: "Aider",
            patterns: vec![
                ".aider.chat.history.md", // Aider chat history
                ".aider.input.history",   // Aider input history
                ".aider.tags.cache.v3",   // Aider tags cache
            ],
            file_type: "chat_history",
        },
        // GitHub Copilot
        ChatHistoryPattern {
            tool: "GitHub Copilot",
            patterns: vec![
                ".copilot/session-state",    // Copilot CLI session files
                ".copilot/session-store.db", // Copilot CLI session store
            ],
            file_type: "chat_history",
        },
        // Qwen Code
        ChatHistoryPattern {
            tool: "Qwen Code",
            patterns: vec![".qwen/.cache", ".config/qwen/cache"],
            file_type: "cache",
        },
        // Goose
        ChatHistoryPattern {
            tool: "Goose CLI",
            patterns: vec![
                ".config/goose/history.txt",
                ".local/share/goose/sessions",
                ".local/state/goose/logs",
            ],
            file_type: "chat_history",
        },
        // OpenHands
        ChatHistoryPattern {
            tool: "OpenHands CLI",
            patterns: vec![".openhands/conversations"],
            file_type: "chat_history",
        },
        // Cline
        ChatHistoryPattern {
            tool: "Cline",
            patterns: vec![
                ".cline/cache",
                ".cline/history",
                ".config/cline/cache",
                ".config/cline/history",
            ],
            file_type: "cache",
        },
        // Amp
        ChatHistoryPattern {
            tool: "Amp",
            patterns: vec![".amp/cache", ".config/amp/cache"],
            file_type: "cache",
        },
        // Crush
        ChatHistoryPattern {
            tool: "Crush",
            patterns: vec![".crush/cache", ".config/crush/cache"],
            file_type: "cache",
        },
        // Codeium
        ChatHistoryPattern {
            tool: "Codeium",
            patterns: vec![
                ".codeium", // Codeium cache
            ],
            file_type: "cache",
        },
        // Windsurf
        ChatHistoryPattern {
            tool: "Windsurf",
            patterns: vec![
                ".windsurf", // Windsurf cache
            ],
            file_type: "cache",
        },
        // Amazon Q
        ChatHistoryPattern {
            tool: "Amazon Q",
            patterns: vec![
                ".amazonq/cache",
                ".amazonq/history",
                ".aws/amazonq/cache",
                ".aws/amazonq/history",
                ".aws/codewhisperer/cache",
            ],
            file_type: "cache",
        },
        // Generic AI patterns
        ChatHistoryPattern {
            tool: "AI Tool",
            patterns: vec![
                ".ai_cache",  // Generic AI cache
                ".llm_cache", // LLM cache
                "ai_context", // AI context files
            ],
            file_type: "cache",
        },
        // Debug files
        ChatHistoryPattern {
            tool: "Debug",
            patterns: vec![
                ".debug",              // Debug directory
                "debug.log",           // Debug log
                ".vscode/launch.json", // VSCode debug config
            ],
            file_type: "debug",
        },
    ]
}

/// Format bytes to human readable string
fn format_size(bytes: u64) -> String {
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

/// Get directory or file size
fn get_size(path: &Path) -> u64 {
    if path.is_file() {
        fs::metadata(path).map(|m| m.len()).unwrap_or(0)
    } else if path.is_dir() {
        WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
            .map(|e| e.path().metadata().map(|m| m.len()).unwrap_or(0))
            .sum()
    } else {
        0
    }
}

/// Check if a path matches any AI tool chat history pattern
fn check_chat_history_pattern(path: &Path) -> Option<(&'static str, &'static str, &'static str)> {
    let file_name = path.file_name()?.to_str()?;
    let path_str = path.to_string_lossy().replace('\\', "/");

    for pattern_group in get_chat_history_patterns() {
        for pattern in &pattern_group.patterns {
            // Check exact file name match
            if !pattern.contains('/') && file_name == *pattern {
                return Some((pattern_group.tool, *pattern, pattern_group.file_type));
            }

            // Check path-based patterns against both the directory/file itself
            // and descendants below that directory.
            if pattern.contains('/')
                && (path_str.ends_with(pattern) || path_str.contains(&format!("{pattern}/")))
            {
                return Some((pattern_group.tool, *pattern, pattern_group.file_type));
            }
        }
    }

    None
}

/// Detect if a directory is a development project
fn is_dev_project(path: &Path) -> bool {
    // Common project indicators
    let project_indicators = [
        "package.json",     // Node.js
        "Cargo.toml",       // Rust
        "pyproject.toml",   // Python
        "requirements.txt", // Python
        "go.mod",           // Go
        "pom.xml",          // Maven/Java
        "build.gradle",     // Gradle/Java
        "composer.json",    // PHP
        "Gemfile",          // Ruby
        ".git",             // Git repository
    ];

    for indicator in &project_indicators {
        if path.join(indicator).exists() {
            return true;
        }
    }

    false
}

fn is_skipped_scan_dir(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| SKIPPED_SCAN_DIRECTORIES.contains(&name))
        .unwrap_or(false)
}

fn user_home_dir() -> Option<PathBuf> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()
        .map(PathBuf::from)
}

fn is_root_path(path: &Path) -> bool {
    path.parent().is_none()
}

fn canonicalize_existing_path(path: &Path) -> Result<PathBuf, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Failed to inspect {}: {}", path.display(), error))?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "Refusing to delete symlink path: {}",
            path.display()
        ));
    }

    path.canonicalize()
        .map_err(|error| format!("Failed to resolve {}: {}", path.display(), error))
}

fn is_root_or_home_path(path: &Path) -> bool {
    if is_root_path(path) {
        return true;
    }

    user_home_dir()
        .and_then(|home| home.canonicalize().ok())
        .map(|home| home == path)
        .unwrap_or(false)
}

fn validate_chat_history_delete_target(path: &Path) -> Result<PathBuf, String> {
    let canonical = canonicalize_existing_path(path)?;

    if is_root_or_home_path(&canonical) {
        return Err(format!(
            "Refusing to delete unsafe path: {}",
            canonical.display()
        ));
    }

    if check_chat_history_pattern(&canonical).is_some()
        || is_known_global_chat_history_path(&canonical)
    {
        Ok(canonical)
    } else {
        Err(format!(
            "Path is not a recognized chat history target: {}",
            canonical.display()
        ))
    }
}

/// Scan a directory for projects with AI chat history
pub fn scan_chat_history(root_path: &str, max_depth: usize) -> Vec<ProjectChatHistory> {
    let root = PathBuf::from(root_path);
    if !root.exists() || !root.is_dir() {
        return Vec::new();
    }

    // First, find all development projects
    let projects: Vec<PathBuf> = WalkDir::new(&root)
        .max_depth(max_depth)
        .into_iter()
        .filter_entry(|entry| {
            entry.depth() == 0 || !entry.file_type().is_dir() || !is_skipped_scan_dir(entry.path())
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter(|e| is_dev_project(e.path()))
        .map(|e| e.path().to_path_buf())
        .collect();

    // For each project, find chat history files
    let results: Vec<ProjectChatHistory> = projects
        .par_iter()
        .filter_map(|project_path| {
            let mut chat_files: Vec<ChatHistoryFile> = Vec::new();
            let mut ai_tools: HashMap<String, bool> = HashMap::new();

            // Scan the project directory for chat history files. Depth 4 covers
            // nested home-style paths such as .local/share/goose/sessions.
            let mut entries = WalkDir::new(project_path).max_depth(4).into_iter();
            while let Some(entry_result) = entries.next() {
                let Ok(entry) = entry_result else {
                    continue;
                };
                let path = entry.path();

                if entry.depth() != 0 && entry.file_type().is_dir() && is_skipped_scan_dir(path) {
                    entries.skip_current_dir();
                    continue;
                }

                if let Some((tool, _pattern, file_type)) = check_chat_history_pattern(path) {
                    let size = get_size(path);
                    let is_dir = path.is_dir();

                    ai_tools.insert(tool.to_string(), true);

                    let id = format!("{:x}", md5::compute(path.to_string_lossy().as_bytes()));

                    chat_files.push(ChatHistoryFile {
                        id,
                        name: path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        path: path.to_string_lossy().to_string(),
                        size,
                        size_display: format_size(size),
                        ai_tool: tool.to_string(),
                        file_type: file_type.to_string(),
                        is_directory: is_dir,
                    });

                    if entry.file_type().is_dir() {
                        entries.skip_current_dir();
                    }
                }
            }

            if chat_files.is_empty() {
                return None;
            }

            let total_size: u64 = chat_files.iter().map(|f| f.size).sum();
            let project_name = project_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let id = format!(
                "{:x}",
                md5::compute(project_path.to_string_lossy().as_bytes())
            );

            Some(ProjectChatHistory {
                id,
                name: project_name,
                project_path: project_path.to_string_lossy().to_string(),
                chat_files,
                total_size,
                total_size_display: format_size(total_size),
                ai_tools_detected: ai_tools.keys().cloned().collect(),
            })
        })
        .collect();

    // Sort by total size (largest first)
    let mut sorted_results = results;
    sorted_results.sort_by_key(|project| Reverse(project.total_size));
    sorted_results
}

/// Delete a chat history file or directory
pub fn delete_chat_file(path: &str) -> Result<String, String> {
    let path_buf = PathBuf::from(path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let path_buf = validate_chat_history_delete_target(&path_buf)?;

    let size = get_size(&path_buf);
    let size_display = format_size(size);

    let result = if path_buf.is_dir() {
        fs::remove_dir_all(&path_buf)
    } else {
        fs::remove_file(&path_buf)
    };

    match result {
        Ok(()) => Ok(format!("Deleted {} ({})", path, size_display)),
        Err(e) => {
            // Try with permission fix on Windows
            #[cfg(target_os = "windows")]
            {
                if fix_permissions_and_delete(&path_buf).is_err() {
                    return Err(format!("Failed to delete {}: {}", path, e));
                }
                Ok(format!("Deleted {} ({})", path, size_display))
            }

            #[cfg(not(target_os = "windows"))]
            {
                if chmod_and_delete(&path_buf).is_ok() {
                    return Ok(format!("Deleted {} ({})", path, size_display));
                }
                Err(format!("Failed to delete {}: {}", path, e))
            }
        }
    }
}

#[cfg(unix)]
fn chmod_and_delete(path: &PathBuf) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;

    if let Ok(metadata) = fs::metadata(path) {
        let mut perms = metadata.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)?;
    }

    if path.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
}

/// Delete all chat history for a project
pub fn delete_project_chat_history(project_path: &str) -> Result<(u32, u32, String), String> {
    let canonical = canonicalize_existing_path(Path::new(project_path))?;
    if is_root_or_home_path(&canonical) {
        return Err(format!(
            "Refusing to scan unsafe project path: {}",
            canonical.display()
        ));
    }
    let canonical_str = canonical.to_string_lossy().to_string();

    let projects = scan_chat_history(&canonical_str, 1);

    let project = projects
        .iter()
        .find(|p| p.project_path == canonical_str)
        .or_else(|| projects.first());

    let project = match project {
        Some(p) => p,
        None => return Err("No chat history found in this project".to_string()),
    };

    let mut success_count = 0u32;
    let mut fail_count = 0u32;
    let mut total_freed = 0u64;

    for file in &project.chat_files {
        match delete_chat_file(&file.path) {
            Ok(_) => {
                success_count += 1;
                total_freed += file.size;
            }
            Err(_) => {
                fail_count += 1;
            }
        }
    }

    Ok((success_count, fail_count, format_size(total_freed)))
}

/// Fix permissions and delete (Windows only)
#[cfg(target_os = "windows")]
#[allow(clippy::permissions_set_readonly_false)]
fn fix_permissions_and_delete(path: &PathBuf) -> std::io::Result<()> {
    use std::os::windows::fs::MetadataExt;

    if path.is_dir() {
        // Recursively fix permissions
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            let p = entry.path();
            if let Ok(meta) = fs::metadata(p) {
                let attrs = meta.file_attributes();
                // Clear Windows FILE_ATTRIBUTE_READONLY before deleting.
                if attrs & 0x1 != 0 {
                    let mut perms = meta.permissions();
                    perms.set_readonly(false);
                    let _ = fs::set_permissions(p, perms);
                }
            }
        }
        fs::remove_dir_all(path)
    } else {
        if let Ok(meta) = fs::metadata(path) {
            let mut perms = meta.permissions();
            perms.set_readonly(false);
            let _ = fs::set_permissions(path, perms);
        }
        fs::remove_file(path)
    }
}

/// Scan global AI chat history locations (home directory)
pub fn scan_global_chat_history() -> Vec<ChatHistoryFile> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();

    if home.is_empty() {
        return Vec::new();
    }

    let home_path = PathBuf::from(&home);
    let mut global_files: Vec<ChatHistoryFile> = Vec::new();

    for (dir_name, tool) in GLOBAL_CHAT_HISTORY_PATTERNS {
        let dir_path = home_path.join(dir_name);
        if dir_path.exists() {
            let size = get_size(&dir_path);
            let id = format!("{:x}", md5::compute(dir_path.to_string_lossy().as_bytes()));

            global_files.push(ChatHistoryFile {
                id,
                name: dir_name.to_string(),
                path: dir_path.to_string_lossy().to_string(),
                size,
                size_display: format_size(size),
                ai_tool: tool.to_string(),
                file_type: "global_config".to_string(),
                is_directory: dir_path.is_dir(),
            });
        }
    }

    // Sort by size
    global_files.sort_by_key(|file| Reverse(file.size));
    global_files
}

fn is_known_global_chat_history_path(path: &Path) -> bool {
    let Some(home) = user_home_dir().and_then(|home| home.canonicalize().ok()) else {
        return false;
    };

    GLOBAL_CHAT_HISTORY_PATTERNS.iter().any(|(dir_name, _)| {
        home.join(dir_name)
            .canonicalize()
            .map(|known_path| known_path == path)
            .unwrap_or(false)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_project(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("dev-janitor-chat-history-{name}-{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn ignores_kiro_project_metadata() {
        let project = temp_project("kiro");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".kiro/agents")).unwrap();
        fs::write(project.join(".kiro/agents/reviewer.md"), "agent config").unwrap();

        let results = scan_chat_history(project.to_str().unwrap(), 3);
        assert!(
            results.is_empty(),
            ".kiro project metadata should not be treated as chat history"
        );

        fs::remove_dir_all(project).unwrap();
    }

    #[test]
    fn ignores_active_ai_project_configs() {
        let project = temp_project("configs");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".claude")).unwrap();
        fs::write(project.join(".claude/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".codex")).unwrap();
        fs::write(project.join(".codex/config.toml"), "model = \"gpt-5.4\"\n").unwrap();
        fs::create_dir_all(project.join(".copilot")).unwrap();
        fs::write(project.join(".copilot/config.json"), "{}\n").unwrap();
        fs::write(project.join(".copilot/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".config/github-copilot")).unwrap();
        fs::write(project.join(".config/github-copilot/config.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".cursor")).unwrap();
        fs::write(project.join(".cursor/cli-config.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".continue")).unwrap();
        fs::write(project.join(".continue/config.yaml"), "name: test\n").unwrap();
        fs::create_dir_all(project.join(".opencode/commands")).unwrap();
        fs::write(project.join(".opencode/commands/fix.md"), "# command\n").unwrap();
        fs::create_dir_all(project.join(".gemini")).unwrap();
        fs::write(project.join(".gemini/settings.json"), "{}\n").unwrap();

        let results = scan_chat_history(project.to_str().unwrap(), 4);
        assert!(
            results.is_empty(),
            "active AI project configuration should not be treated as chat history"
        );

        fs::remove_dir_all(project).unwrap();
    }

    #[test]
    fn ignores_new_active_ai_project_configs() {
        let project = temp_project("new-configs");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".qwen")).unwrap();
        fs::write(project.join(".qwen/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".cline")).unwrap();
        fs::write(project.join(".cline/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".amp")).unwrap();
        fs::write(project.join(".amp/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".crush")).unwrap();
        fs::write(project.join(".crush/config.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".amazonq")).unwrap();
        fs::write(project.join(".amazonq/mcp.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".augment")).unwrap();
        fs::write(project.join(".augment/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".config/kilo")).unwrap();
        fs::write(project.join(".config/kilo/config.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".junie/mcp")).unwrap();
        fs::write(project.join(".junie/AGENTS.md"), "project instructions\n").unwrap();
        fs::write(project.join(".junie/mcp/mcp.json"), "{}\n").unwrap();
        fs::write(project.join(".goosehints"), "project hints").unwrap();
        fs::write(project.join("AGENT.md"), "project instructions").unwrap();
        fs::create_dir_all(project.join(".openhands/hooks")).unwrap();
        fs::write(project.join(".openhands/hooks.json"), "{}\n").unwrap();
        fs::write(project.join(".openhands/setup.sh"), "#!/bin/sh\n").unwrap();

        let results = scan_chat_history(project.to_str().unwrap(), 4);
        assert!(
            results.is_empty(),
            "active AI project configuration should not be treated as chat history"
        );

        fs::remove_dir_all(project).unwrap();
    }

    #[test]
    fn detects_copilot_cli_session_targets_without_config_noise() {
        let project = temp_project("copilot-cli-session");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".copilot")).unwrap();
        fs::write(project.join(".copilot/config.json"), "{}\n").unwrap();
        fs::write(project.join(".copilot/settings.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join(".config/github-copilot")).unwrap();
        fs::write(project.join(".config/github-copilot/config.json"), "{}\n").unwrap();

        let session_state = project.join(".copilot/session-state");
        let session_store = project.join(".copilot/session-store.db");
        fs::create_dir_all(&session_state).unwrap();
        fs::write(session_state.join("events.jsonl"), "{}\n").unwrap();
        fs::write(&session_store, "sqlite").unwrap();

        let results = scan_chat_history(project.to_str().unwrap(), 4);
        assert_eq!(results.len(), 1);
        let result_paths: Vec<_> = results[0]
            .chat_files
            .iter()
            .map(|file| file.path.as_str())
            .collect();

        assert!(
            result_paths
                .iter()
                .any(|path| *path == session_state.to_string_lossy()),
            "Copilot CLI session-state should be detected as chat history"
        );
        assert!(
            result_paths
                .iter()
                .any(|path| *path == session_store.to_string_lossy()),
            "Copilot CLI session-store.db should be detected as chat history"
        );
        assert!(
            !result_paths.iter().any(|path| path.ends_with(".copilot")
                || path.ends_with(".copilot/config.json")
                || path.ends_with(".copilot/settings.json")
                || path.contains(".config/github-copilot")),
            "Copilot config directories and files should not be treated as chat history"
        );

        fs::remove_dir_all(project).unwrap();
    }

    #[test]
    fn detects_goose_and_openhands_project_history_without_config_noise() {
        let project = temp_project("goose-openhands-history");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        fs::write(project.join(".goosehints"), "project hints").unwrap();
        fs::write(project.join("AGENT.md"), "project instructions").unwrap();
        fs::create_dir_all(project.join(".openhands/hooks")).unwrap();
        fs::write(project.join(".openhands/hooks.json"), "{}\n").unwrap();
        fs::write(project.join(".openhands/setup.sh"), "#!/bin/sh\n").unwrap();

        let goose_history = project.join(".config/goose/history.txt");
        let goose_sessions = project.join(".local/share/goose/sessions");
        let goose_logs = project.join(".local/state/goose/logs");
        let openhands_conversations = project.join(".openhands/conversations");
        fs::create_dir_all(goose_history.parent().unwrap()).unwrap();
        fs::create_dir_all(&goose_sessions).unwrap();
        fs::create_dir_all(&goose_logs).unwrap();
        fs::create_dir_all(&openhands_conversations).unwrap();
        fs::write(&goose_history, "goose history").unwrap();
        fs::write(goose_sessions.join("sessions.db"), "sessions").unwrap();
        fs::write(goose_logs.join("goose.log"), "logs").unwrap();
        fs::write(openhands_conversations.join("conversation.json"), "{}\n").unwrap();

        let results = scan_chat_history(project.to_str().unwrap(), 6);
        assert_eq!(results.len(), 1);
        let result_paths: Vec<_> = results[0]
            .chat_files
            .iter()
            .map(|file| file.path.as_str())
            .collect();

        for expected_path in [
            goose_history.to_string_lossy(),
            goose_sessions.to_string_lossy(),
            goose_logs.to_string_lossy(),
            openhands_conversations.to_string_lossy(),
        ] {
            assert!(
                result_paths.iter().any(|path| *path == expected_path),
                "{} should be detected as chat history",
                expected_path
            );
        }

        assert!(
            !result_paths.iter().any(|path| path.contains(".goosehints")
                || path.contains("AGENT.md")
                || path.contains(".openhands/hooks")
                || path.contains(".openhands/setup.sh")),
            "Goose/OpenHands project instructions should not be treated as chat history"
        );

        let session_matches = result_paths
            .iter()
            .filter(|path| path.contains(".local/share/goose/sessions"))
            .count();
        assert_eq!(
            session_matches, 1,
            "a matched Goose sessions directory should be reported once"
        );

        fs::remove_dir_all(project).unwrap();
    }

    #[test]
    fn skips_dependency_directories_during_project_scan() {
        let project = temp_project("skip-deps");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        fs::create_dir_all(project.join("node_modules/nested/.copilot")).unwrap();
        fs::write(
            project.join("node_modules/nested/.copilot/history.json"),
            "{}\n",
        )
        .unwrap();
        fs::create_dir_all(project.join("target/debug/.cline/history")).unwrap();
        fs::write(
            project.join("target/debug/.cline/history/session.json"),
            "{}\n",
        )
        .unwrap();

        let results = scan_chat_history(project.to_str().unwrap(), 6);
        assert!(
            results.is_empty(),
            "dependency and build directories should be pruned before matching chat history"
        );

        fs::remove_dir_all(project).unwrap();
    }
}
