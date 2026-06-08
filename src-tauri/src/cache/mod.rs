//! Cache scanning and cleaning module for Dev Janitor v2
//! Supports 11+ package manager caches and project caches

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Represents a cache entry that can be cleaned
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub size_display: String,
    pub cache_type: String, // "package_manager" or "project"
}

/// Format bytes to human readable string
pub fn format_size(bytes: u64) -> String {
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

/// Calculate directory size recursively
pub fn get_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|metadata| metadata.len())
        .sum()
}

fn env_path(name: &str) -> Option<PathBuf> {
    std::env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn push_join(paths: &mut Vec<PathBuf>, base: &Option<PathBuf>, relative: &str) {
    if let Some(base) = base {
        paths.push(base.join(relative));
    }
}

/// Get package manager cache paths
fn get_package_manager_caches() -> Vec<(&'static str, &'static str, Vec<PathBuf>)> {
    let home = user_home_dir();
    let local_app_data = env_path("LOCALAPPDATA");
    let app_data = env_path("APPDATA");

    vec![
        // npm
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".npm");
            push_join(&mut paths, &local_app_data, "npm-cache");
            ("npm", "npm Cache", paths)
        },
        // yarn
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".yarn/cache");
            push_join(&mut paths, &local_app_data, "Yarn/Cache");
            ("yarn", "Yarn Cache", paths)
        },
        // pnpm
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".pnpm-store");
            push_join(&mut paths, &local_app_data, "pnpm/store");
            ("pnpm", "pnpm Cache", paths)
        },
        // pip
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".cache/pip");
            push_join(&mut paths, &local_app_data, "pip/Cache");
            ("pip", "pip Cache", paths)
        },
        // conda
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".conda/pkgs");
            push_join(&mut paths, &app_data, "conda/conda/pkgs");
            ("conda", "Conda Cache", paths)
        },
        // cargo
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".cargo/registry/cache");
            ("cargo", "Cargo Cache", paths)
        },
        // composer
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".composer/cache");
            push_join(&mut paths, &local_app_data, "Composer/cache");
            ("composer", "Composer Cache", paths)
        },
        // maven
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".m2/repository");
            ("maven", "Maven Cache", paths)
        },
        // gradle
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".gradle/caches");
            ("gradle", "Gradle Cache", paths)
        },
        // homebrew (macOS)
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, "Library/Caches/Homebrew");
            ("homebrew", "Homebrew Cache", paths)
        },
        // go modules
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, "go/pkg/mod/cache");
            ("go", "Go Modules Cache", paths)
        },
        // uv (Python)
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".cache/uv");
            push_join(&mut paths, &home, "Library/Caches/uv");
            push_join(&mut paths, &local_app_data, "uv/cache");
            ("uv", "uv Cache", paths)
        },
        // bun
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".bun/install/cache");
            push_join(&mut paths, &local_app_data, "bun/install/cache");
            ("bun", "Bun Cache", paths)
        },
        // deno
        {
            let mut paths = Vec::new();
            push_join(&mut paths, &home, ".cache/deno");
            push_join(&mut paths, &home, "Library/Caches/deno");
            push_join(&mut paths, &local_app_data, "deno");
            ("deno", "Deno Cache", paths)
        },
    ]
}

fn user_home_dir() -> Option<PathBuf> {
    env_path("HOME").or_else(|| env_path("USERPROFILE"))
}

fn canonicalize_existing_path(path: &Path) -> Result<PathBuf, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Failed to inspect {}: {}", path.display(), error))?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "Refusing to clean symlink path: {}",
            path.display()
        ));
    }

    path.canonicalize()
        .map_err(|error| format!("Failed to resolve {}: {}", path.display(), error))
}

fn is_root_or_home_path(path: &Path) -> bool {
    if path.parent().is_none() {
        return true;
    }

    user_home_dir()
        .and_then(|home| home.canonicalize().ok())
        .map(|home| home == path)
        .unwrap_or(false)
}

fn is_system_temp_dir(path: &Path) -> bool {
    std::env::temp_dir()
        .canonicalize()
        .map(|temp_dir| temp_dir == path)
        .unwrap_or(false)
}

fn is_known_package_manager_cache(path: &Path) -> bool {
    get_package_manager_caches()
        .into_iter()
        .flat_map(|(_, _, paths)| paths)
        .filter_map(|candidate| candidate.canonicalize().ok())
        .any(|candidate| candidate == path)
}

fn is_known_project_cache(path: &Path) -> bool {
    path.is_dir()
        && path
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| {
                PROJECT_CACHE_PATTERNS
                    .iter()
                    .any(|(pattern, _)| name == *pattern)
            })
            .unwrap_or(false)
        && has_dev_project_ancestor(path)
}

const DEV_PROJECT_INDICATORS: &[&str] = &[
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "composer.json",
    "Gemfile",
    ".git",
];

fn has_dev_project_ancestor(path: &Path) -> bool {
    for ancestor in path.ancestors().skip(1) {
        if is_root_or_home_path(ancestor) {
            break;
        }

        if is_system_temp_dir(ancestor) {
            continue;
        }

        if DEV_PROJECT_INDICATORS
            .iter()
            .any(|indicator| ancestor.join(indicator).exists())
        {
            return true;
        }
    }

    false
}

fn validate_cache_cleanup_target(path: &Path) -> Result<PathBuf, String> {
    let canonical = canonicalize_existing_path(path)?;

    if is_root_or_home_path(&canonical) {
        return Err(format!(
            "Refusing to clean unsafe path: {}",
            canonical.display()
        ));
    }

    if is_known_package_manager_cache(&canonical) || is_known_project_cache(&canonical) {
        Ok(canonical)
    } else {
        Err(format!(
            "Path is not a recognized cache target: {}",
            canonical.display()
        ))
    }
}

/// Scan all package manager caches
pub fn scan_package_manager_caches() -> Vec<CacheInfo> {
    let caches_config = get_package_manager_caches();

    caches_config
        .par_iter()
        .filter_map(|(id, name, paths)| {
            // Find first existing path
            for path in paths {
                if path.exists() {
                    let size = get_dir_size(path);
                    if size > 0 {
                        return Some(CacheInfo {
                            id: id.to_string(),
                            name: name.to_string(),
                            path: path.to_string_lossy().to_string(),
                            size,
                            size_display: format_size(size),
                            cache_type: "package_manager".to_string(),
                        });
                    }
                }
            }
            None
        })
        .collect()
}

/// Project cache patterns to look for
const PROJECT_CACHE_PATTERNS: &[(&str, &str)] = &[
    ("node_modules", "Node Modules"),
    ("target", "Rust Target"),
    ("__pycache__", "Python Cache"),
    (".gradle", "Gradle Build"),
    ("build", "Build Output"),
    ("dist", "Dist Output"),
    (".next", "Next.js Cache"),
    (".nuxt", "Nuxt.js Cache"),
    (".turbo", "Turbo Cache"),
    ("venv", "Python Venv"),
    (".venv", "Python Venv"),
    ("vendor", "Vendor Directory"),
    (".angular", "Angular Cache"),
    (".parcel-cache", "Parcel Cache"),
    (".svelte-kit", "SvelteKit Output"),
    (".output", "Nitro/Nuxt Output"),
    (".cache", "Generic Build Cache"),
];

/// Scan a directory for project caches
pub fn scan_project_caches(root_path: &str, max_depth: usize) -> Vec<CacheInfo> {
    let root = PathBuf::from(root_path);
    if !root.exists() {
        return Vec::new();
    }

    let mut caches = Vec::new();

    let mut entries = WalkDir::new(&root).max_depth(max_depth).into_iter();

    while let Some(entry_result) = entries.next() {
        let Ok(entry) = entry_result else {
            continue;
        };

        if entry.file_type().is_dir() {
            let dir_name = entry.file_name().to_string_lossy();

            for (pattern, name) in PROJECT_CACHE_PATTERNS {
                if dir_name == *pattern && has_dev_project_ancestor(entry.path()) {
                    let path = entry.path().to_path_buf();
                    let size = get_dir_size(&path);

                    if size > 1024 * 1024 {
                        // Only include if > 1MB
                        caches.push(CacheInfo {
                            id: format!("{}_{}", pattern, caches.len()),
                            name: name.to_string(),
                            path: path.to_string_lossy().to_string(),
                            size,
                            size_display: format_size(size),
                            cache_type: "project".to_string(),
                        });
                    }

                    entries.skip_current_dir();
                    break;
                }
            }
        }
    }

    // Sort by size descending
    caches.sort_by_key(|cache| Reverse(cache.size));
    caches
}

/// Clean a cache directory
pub fn clean_cache(path: &str) -> Result<String, String> {
    let cache_path = PathBuf::from(path);

    if !cache_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let cache_path = validate_cache_cleanup_target(&cache_path)?;

    // Get size before deletion
    let size_before = get_dir_size(&cache_path);

    // Try to remove the directory
    match fs::remove_dir_all(&cache_path) {
        Ok(_) => Ok(format!(
            "Successfully cleaned {} (freed {})",
            path,
            format_size(size_before)
        )),
        Err(e) => {
            // Try with more aggressive approach on Windows
            #[cfg(target_os = "windows")]
            {
                // Try to remove readonly attributes first
                if remove_readonly_and_delete(&cache_path).is_err() {
                    return Err(format!("Failed to clean {}: {}", path, e));
                }
                Ok(format!(
                    "Successfully cleaned {} (freed {})",
                    path,
                    format_size(size_before)
                ))
            }

            #[cfg(not(target_os = "windows"))]
            Err(format!("Failed to clean {}: {}", path, e))
        }
    }
}

#[cfg(target_os = "windows")]
#[allow(clippy::permissions_set_readonly_false)]
fn remove_readonly_and_delete(path: &PathBuf) -> std::io::Result<()> {
    use std::os::windows::fs::MetadataExt;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        if let Ok(metadata) = fs::metadata(entry_path) {
            // Check if file is readonly (FILE_ATTRIBUTE_READONLY = 1)
            if metadata.file_attributes() & 1 != 0 {
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(entry_path, perms);
            }
        }
    }

    fs::remove_dir_all(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_project(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("dev-janitor-cache-{name}-{nanos}"));
        fs::create_dir_all(&dir).expect("temp directory should be created");
        dir
    }

    fn write_large_file(path: &Path) {
        fs::write(path, vec![b'x'; 1024 * 1024 + 1]).expect("test file should be written");
    }

    #[test]
    fn project_cache_scan_reports_matched_directory_once() {
        let project = temp_project("dedupe");
        fs::write(project.join("package.json"), "{}\n").unwrap();
        let nested_cache = project.join("node_modules/nested/node_modules");
        fs::create_dir_all(&nested_cache).unwrap();
        write_large_file(&nested_cache.join("payload.bin"));

        let results = scan_project_caches(project.to_str().unwrap(), 8);
        let node_modules_matches: Vec<_> = results
            .iter()
            .filter(|cache| cache.path.contains("node_modules"))
            .collect();

        assert_eq!(
            node_modules_matches.len(),
            1,
            "matched cache directories should be pruned to avoid descendant duplicates"
        );
        assert_eq!(
            PathBuf::from(&node_modules_matches[0].path),
            project.join("node_modules")
        );

        fs::remove_dir_all(project).unwrap();
    }

    #[test]
    fn refuses_project_cache_without_project_marker() {
        let root = temp_project("orphan");
        let cache = root.join("build");
        fs::create_dir_all(&cache).unwrap();
        write_large_file(&cache.join("payload.bin"));

        let result = clean_cache(cache.to_str().unwrap());

        assert!(result
            .expect_err("orphan project cache name should not be enough to delete")
            .contains("not a recognized cache target"));
        assert!(cache.exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn cleans_project_cache_inside_dev_project() {
        let project = temp_project("clean-project");
        fs::write(
            project.join("Cargo.toml"),
            "[package]\nname = \"fixture\"\n",
        )
        .unwrap();
        let cache = project.join("target");
        fs::create_dir_all(&cache).unwrap();
        write_large_file(&cache.join("payload.bin"));

        let result = clean_cache(cache.to_str().unwrap()).expect("project cache should clean");

        assert!(result.contains("Successfully cleaned"));
        assert!(!cache.exists());

        fs::remove_dir_all(project).unwrap();
    }
}
