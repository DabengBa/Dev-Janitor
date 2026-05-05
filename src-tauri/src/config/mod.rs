//! Environment configuration diagnostics module for Dev Janitor v2
//! PATH and Shell configuration analysis

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use winreg::{
    enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ},
    RegKey, HKEY,
};

/// Represents a PATH entry with analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathEntry {
    pub path: String,
    pub exists: bool,
    pub is_dev_related: bool,
    pub category: String,
    pub issues: Vec<String>,
}

/// Represents a shell config file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellConfig {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub content: Option<String>,
    pub dev_exports: Vec<String>,
    pub issues: Vec<String>,
}

/// Environment diagnosis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvDiagnosis {
    pub path_entries: Vec<PathEntry>,
    pub shell_configs: Vec<ShellConfig>,
    pub issues: Vec<DiagnosisIssue>,
    pub suggestions: Vec<String>,
}

/// A diagnosis issue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosisIssue {
    pub severity: String, // "error", "warning", "info"
    pub category: String,
    pub message: String,
    pub suggestion: Option<String>,
}

/// Dev-related path patterns
const DEV_PATH_PATTERNS: &[(&str, &str)] = &[
    ("node", "Node.js"),
    ("npm", "npm"),
    ("nvm", "nvm"),
    ("fnm", "fnm"),
    ("python", "Python"),
    ("pyenv", "pyenv"),
    ("conda", "Conda"),
    ("cargo", "Rust"),
    ("rustup", "Rust"),
    (".cargo", "Rust"),
    ("go/bin", "Go"),
    ("java", "Java"),
    ("jdk", "Java"),
    ("maven", "Maven"),
    ("gradle", "Gradle"),
    ("ruby", "Ruby"),
    ("rbenv", "rbenv"),
    ("gem", "Ruby"),
    ("php", "PHP"),
    ("composer", "Composer"),
    ("dotnet", ".NET"),
    ("docker", "Docker"),
    ("kubectl", "Kubernetes"),
    ("homebrew", "Homebrew"),
    ("brew", "Homebrew"),
    ("deno", "Deno"),
    ("bun", "Bun"),
    (".local/bin", "User Local"),
    ("bin", "Binaries"),
    ("scripts", "Scripts"),
];

/// Get the current PATH and analyze it
pub fn analyze_path() -> Vec<PathEntry> {
    let path_var = get_path_var();

    #[cfg(target_os = "windows")]
    let separator = ';';
    #[cfg(not(target_os = "windows"))]
    let separator = ':';

    analyze_path_var(&path_var, separator)
}

fn analyze_path_var(path_var: &str, separator: char) -> Vec<PathEntry> {
    let mut entries: Vec<PathEntry> = path_var
        .split(separator)
        .map(str::trim)
        .filter(|p| !p.is_empty())
        .map(|p| {
            let checked_path = expand_path_entry(p);
            let path = PathBuf::from(&checked_path);
            let exists = path.exists();

            let path_lower = format!("{} {}", p, checked_path).to_lowercase();
            let (is_dev_related, category) = DEV_PATH_PATTERNS
                .iter()
                .find(|(pattern, _)| path_lower.contains(pattern))
                .map(|(_, cat)| (true, cat.to_string()))
                .unwrap_or((false, "System".to_string()));

            let mut issues = Vec::new();

            // Check for issues
            if !exists {
                issues.push("Path does not exist".to_string());
            }

            // Check for spaces in path (can cause issues)
            if p.contains(' ') && !p.starts_with('"') {
                issues.push("Path contains spaces (may cause issues in some shells)".to_string());
            }

            PathEntry {
                path: p.to_string(),
                exists,
                is_dev_related,
                category,
                issues,
            }
        })
        .collect();

    // Check for duplicates
    let mut seen: HashMap<String, usize> = HashMap::new();
    for (i, entry) in entries.iter_mut().enumerate() {
        let path_lower = entry.path.to_lowercase();
        if let Some(first_idx) = seen.get(&path_lower) {
            entry.issues.push(format!(
                "Duplicate path (first at position {})",
                first_idx + 1
            ));
        } else {
            seen.insert(path_lower, i);
        }
    }

    entries
}

#[cfg(target_os = "windows")]
fn get_path_var() -> String {
    get_persistent_windows_path().unwrap_or_else(|| env::var("PATH").unwrap_or_default())
}

#[cfg(not(target_os = "windows"))]
fn get_path_var() -> String {
    env::var("PATH").unwrap_or_default()
}

#[cfg(target_os = "windows")]
fn get_persistent_windows_path() -> Option<String> {
    let machine_path = read_registry_path(
        HKEY_LOCAL_MACHINE,
        r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
    );
    let user_path = read_registry_path(HKEY_CURRENT_USER, r"Environment");

    let path = [machine_path, user_path]
        .into_iter()
        .flatten()
        .filter(|path| !path.trim().is_empty())
        .collect::<Vec<_>>()
        .join(";");

    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}

#[cfg(target_os = "windows")]
fn read_registry_path(root: HKEY, subkey: &str) -> Option<String> {
    let key = RegKey::predef(root)
        .open_subkey_with_flags(subkey, KEY_READ)
        .ok()?;

    key.get_value("Path")
        .or_else(|_| key.get_value("PATH"))
        .ok()
}

fn expand_path_entry(path: &str) -> String {
    let path = path.trim().trim_matches('"');

    #[cfg(target_os = "windows")]
    {
        expand_windows_env_vars(path)
    }

    #[cfg(not(target_os = "windows"))]
    {
        path.to_string()
    }
}

#[cfg(target_os = "windows")]
fn expand_windows_env_vars(path: &str) -> String {
    let mut expanded = String::with_capacity(path.len());
    let mut remainder = path;

    while let Some(start) = remainder.find('%') {
        expanded.push_str(&remainder[..start]);
        let after_start = &remainder[start + 1..];

        let Some(end) = after_start.find('%') else {
            expanded.push('%');
            expanded.push_str(after_start);
            return expanded;
        };

        let name = &after_start[..end];
        if name.is_empty() {
            expanded.push_str("%%");
        } else if let Ok(value) = env::var(name) {
            expanded.push_str(&value);
        } else {
            expanded.push('%');
            expanded.push_str(name);
            expanded.push('%');
        }

        remainder = &after_start[end + 1..];
    }

    expanded.push_str(remainder);
    expanded
}

/// Get shell configuration files
pub fn get_shell_configs() -> Vec<ShellConfig> {
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_default();

    let config_files = vec![
        // Bash
        (".bashrc", "Bash RC"),
        (".bash_profile", "Bash Profile"),
        (".profile", "Profile"),
        // Zsh
        (".zshrc", "Zsh RC"),
        (".zprofile", "Zsh Profile"),
        (".zshenv", "Zsh Env"),
        // Fish
        (".config/fish/config.fish", "Fish Config"),
        // PowerShell
        (
            "Documents/PowerShell/Microsoft.PowerShell_profile.ps1",
            "PowerShell Profile",
        ),
        (
            "Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1",
            "Windows PowerShell Profile",
        ),
        // Nushell
        (".config/nushell/config.nu", "Nushell Config"),
    ];

    config_files
        .into_iter()
        .map(|(relative_path, name)| {
            let full_path = PathBuf::from(&home).join(relative_path);
            let exists = full_path.exists();

            let (content, dev_exports, issues) = if exists {
                match fs::read_to_string(&full_path) {
                    Ok(content) => {
                        let exports = extract_dev_exports(&content);
                        let issues = analyze_shell_config(&content);
                        (Some(content), exports, issues)
                    }
                    Err(_) => (None, Vec::new(), vec!["Could not read file".to_string()]),
                }
            } else {
                (None, Vec::new(), Vec::new())
            };

            ShellConfig {
                name: name.to_string(),
                path: full_path.to_string_lossy().to_string(),
                exists,
                content,
                dev_exports,
                issues,
            }
        })
        .collect()
}

/// Extract export statements related to dev tools
fn extract_dev_exports(content: &str) -> Vec<String> {
    let mut exports = Vec::new();

    let keywords = [
        "PATH", "NODE", "NPM", "NVM", "PYTHON", "PYENV", "CONDA", "CARGO", "RUST", "GO", "GOPATH",
        "JAVA", "MAVEN", "GRADLE", "RUBY", "GEM", "PHP", "COMPOSER", "DOTNET", "DOCKER",
    ];

    for line in content.lines() {
        let line_upper = line.to_uppercase();

        // Check if line is an export or set statement
        if line.trim().starts_with("export ")
            || line.trim().starts_with("set ")
            || line.trim().starts_with("$env:")
            || line.contains("PATH")
        {
            // Check if it contains dev-related keywords
            if keywords.iter().any(|k| line_upper.contains(k)) {
                exports.push(line.trim().to_string());
            }
        }
    }

    exports
}

/// Analyze shell config for common issues
fn analyze_shell_config(content: &str) -> Vec<String> {
    let mut issues = Vec::new();

    // Check for common problems
    if content.contains("nvm") && !content.contains("NVM_DIR") {
        issues.push("nvm is referenced but NVM_DIR may not be set".to_string());
    }

    if content.contains("pyenv") && !content.contains("PYENV_ROOT") {
        issues.push("pyenv is referenced but PYENV_ROOT may not be set".to_string());
    }

    // Check for potential path issues
    let path_count = content.matches("PATH").count();
    if path_count > 10 {
        issues.push(format!(
            "PATH is modified {} times (may cause issues)",
            path_count
        ));
    }

    issues
}

/// Run full environment diagnosis
pub fn diagnose_environment() -> EnvDiagnosis {
    let path_entries = analyze_path();
    let shell_configs = get_shell_configs();

    let mut issues = Vec::new();
    let mut suggestions = Vec::new();

    // Analyze PATH issues
    let non_existent: Vec<_> = path_entries.iter().filter(|e| !e.exists).collect();

    if !non_existent.is_empty() {
        issues.push(DiagnosisIssue {
            severity: "warning".to_string(),
            category: "PATH".to_string(),
            message: format!("{} PATH entries do not exist", non_existent.len()),
            suggestion: Some("Consider removing non-existent paths from PATH".to_string()),
        });
    }

    let duplicates: Vec<_> = path_entries
        .iter()
        .filter(|e| e.issues.iter().any(|i| i.contains("Duplicate")))
        .collect();

    if !duplicates.is_empty() {
        issues.push(DiagnosisIssue {
            severity: "info".to_string(),
            category: "PATH".to_string(),
            message: format!("{} duplicate PATH entries found", duplicates.len()),
            suggestion: Some("Remove duplicate entries to clean up PATH".to_string()),
        });
    }

    // Check for common dev tools in PATH
    let has_node = path_entries.iter().any(|e| e.category == "Node.js");
    let has_python = path_entries.iter().any(|e| e.category == "Python");
    let has_rust = path_entries.iter().any(|e| e.category == "Rust");
    let has_go = path_entries.iter().any(|e| e.category == "Go");

    if !has_node {
        suggestions.push("Node.js not found in PATH. Consider installing Node.js.".to_string());
    }
    if !has_python {
        suggestions.push("Python not found in PATH. Consider installing Python.".to_string());
    }

    // Analyze shell configs
    let existing_configs: Vec<_> = shell_configs.iter().filter(|c| c.exists).collect();

    if existing_configs.is_empty() {
        issues.push(DiagnosisIssue {
            severity: "info".to_string(),
            category: "Shell".to_string(),
            message: "No shell configuration files found".to_string(),
            suggestion: None,
        });
    }

    // Collect shell config issues
    for config in &shell_configs {
        for issue in &config.issues {
            issues.push(DiagnosisIssue {
                severity: "warning".to_string(),
                category: config.name.clone(),
                message: issue.clone(),
                suggestion: None,
            });
        }
    }

    EnvDiagnosis {
        path_entries,
        shell_configs,
        issues,
        suggestions,
    }
}

/// Get recommended PATH cleanup
pub fn get_path_cleanup_suggestions(entries: &[PathEntry]) -> Vec<String> {
    entries
        .iter()
        .filter(|e| !e.issues.is_empty())
        .map(|e| format!("{}: {}", e.path, e.issues.join(", ")))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = env::temp_dir().join(format!("dev-janitor-config-{name}-{nanos}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn analyze_path_var_trims_entries_and_skips_empty_values() {
        let dir = temp_dir("trim");
        let path_var = format!(" ; {} ; ;", dir.display());

        let entries = analyze_path_var(&path_var, ';');

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].path, dir.display().to_string());
        assert!(entries[0].exists);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn analyze_path_var_checks_quoted_path_existence() {
        let dir = temp_dir("quoted");
        let quoted = format!("\"{}\"", dir.display());

        let entries = analyze_path_var(&quoted, ';');

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].path, quoted);
        assert!(entries[0].exists);

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn analyze_path_var_marks_duplicate_entries() {
        let dir = temp_dir("duplicate");
        let path_var = format!("{};{}", dir.display(), dir.display());

        let entries = analyze_path_var(&path_var, ';');

        assert_eq!(entries.len(), 2);
        assert!(entries[0].issues.is_empty());
        assert!(entries[1]
            .issues
            .iter()
            .any(|issue| issue.contains("Duplicate path")));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn analyze_path_var_marks_missing_entries() {
        let missing = env::temp_dir().join("dev-janitor-config-missing-entry");
        let _ = fs::remove_dir_all(&missing);

        let entries = analyze_path_var(&missing.display().to_string(), ';');

        assert_eq!(entries.len(), 1);
        assert!(!entries[0].exists);
        assert!(entries[0]
            .issues
            .iter()
            .any(|issue| issue == "Path does not exist"));
    }
}
