//! Chat History Management module for Dev Janitor v2
//! Manages AI coding assistant chat histories and related debug files
//! Implements Issue #35: https://github.com/cocojojo5213/Dev-Janitor/issues/35

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

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
            patterns: vec![
                ".claude",       // Claude project directory
                "claude_output", // Claude output files
            ],
            file_type: "chat_history",
        },
        // OpenAI Codex
        ChatHistoryPattern {
            tool: "OpenAI Codex",
            patterns: vec![
                ".codex", // Codex directory
            ],
            file_type: "chat_history",
        },
        // OpenCode
        ChatHistoryPattern {
            tool: "OpenCode",
            patterns: vec![
                ".opencode", // OpenCode directory
            ],
            file_type: "chat_history",
        },
        // Gemini CLI
        ChatHistoryPattern {
            tool: "Gemini CLI",
            patterns: vec![
                ".gemini", // Gemini directory
            ],
            file_type: "chat_history",
        },
        // Aider
        ChatHistoryPattern {
            tool: "Aider",
            patterns: vec![
                ".aider.chat.history.md", // Aider chat history
                ".aider.input.history",   // Aider input history
                ".aider.tags.cache.v3",   // Aider tags cache
                ".aider",                 // Aider directory
            ],
            file_type: "chat_history",
        },
        // Cursor
        ChatHistoryPattern {
            tool: "Cursor",
            patterns: vec![
                ".cursor",       // Cursor directory
                ".cursorignore", // Cursor ignore file
                ".cursorrules",  // Cursor rules
            ],
            file_type: "chat_history",
        },
        // Continue
        ChatHistoryPattern {
            tool: "Continue",
            patterns: vec![
                ".continue", // Continue directory
            ],
            file_type: "chat_history",
        },
        // Cody (Sourcegraph)
        ChatHistoryPattern {
            tool: "Cody",
            patterns: vec![
                ".sourcegraph", // Cody directory
            ],
            file_type: "chat_history",
        },
        // GitHub Copilot
        ChatHistoryPattern {
            tool: "GitHub Copilot",
            patterns: vec![
                ".copilot", // Copilot cache
            ],
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
    let path_str = path.to_string_lossy();

    for pattern_group in get_chat_history_patterns() {
        for pattern in &pattern_group.patterns {
            // Check exact file name match
            if file_name == *pattern {
                return Some((pattern_group.tool, *pattern, pattern_group.file_type));
            }
            // Check if pattern is in path (for nested patterns like .vscode/launch.json)
            if pattern.contains('/') && path_str.replace('\\', "/").ends_with(pattern) {
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

            // Scan the project directory for chat history files
            for entry in WalkDir::new(project_path)
                .max_depth(3) // Don't go too deep within a project
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();

                // Skip node_modules, .git, target, venv, etc.
                let path_str = path.to_string_lossy();
                if path_str.contains("node_modules")
                    || path_str.contains(".git/")
                    || path_str.contains(".git\\")
                    || path_str.contains("target/")
                    || path_str.contains("target\\")
                    || path_str.contains("venv/")
                    || path_str.contains("venv\\")
                    || path_str.contains("__pycache__")
                {
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
    sorted_results.sort_by(|a, b| b.total_size.cmp(&a.total_size));
    sorted_results
}

/// Delete a chat history file or directory
pub fn delete_chat_file(path: &str) -> Result<String, String> {
    let path_buf = PathBuf::from(path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

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
                Err(format!("Failed to delete {}: {}", path, e))
            }
        }
    }
}

/// Delete all chat history for a project
pub fn delete_project_chat_history(project_path: &str) -> Result<(u32, u32, String), String> {
    let projects = scan_chat_history(project_path, 1);

    if projects.is_empty() {
        return Err("No chat history found in this project".to_string());
    }

    let project = &projects[0];
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
fn fix_permissions_and_delete(path: &PathBuf) -> std::io::Result<()> {
    use std::os::windows::fs::MetadataExt;

    if path.is_dir() {
        // Recursively fix permissions
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            let p = entry.path();
            if let Ok(meta) = fs::metadata(p) {
                let attrs = meta.file_attributes();
                // Remove read-only attribute (0x1)
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

    // Scan known global AI tool directories
    let global_patterns = [
        (".claude", "Claude Code"),
        (".codex", "OpenAI Codex"),
        (".opencode", "OpenCode"),
        (".gemini", "Gemini CLI"),
        (".aider", "Aider"),
        (".cursor", "Cursor"),
        (".continue", "Continue"),
        (".sourcegraph", "Cody"),
        (".copilot", "GitHub Copilot"),
        (".codeium", "Codeium"),
    ];

    for (dir_name, tool) in &global_patterns {
        let dir_path = home_path.join(dir_name);
        if dir_path.exists() && dir_path.is_dir() {
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
                is_directory: true,
            });
        }
    }

    // Sort by size
    global_files.sort_by(|a, b| b.size.cmp(&a.size));
    global_files
}
