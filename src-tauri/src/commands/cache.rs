//! Tauri commands for cache management

use super::run_blocking;
use crate::cache::{clean_cache, scan_package_manager_caches, scan_project_caches, CacheInfo};

/// Scan all package manager caches
#[tauri::command]
pub async fn scan_caches() -> Result<Vec<CacheInfo>, String> {
    run_blocking(scan_package_manager_caches).await
}

/// Scan project caches in a directory
#[tauri::command]
pub async fn scan_project_caches_cmd(
    path: String,
    #[allow(non_snake_case)] maxDepth: usize,
) -> Result<Vec<CacheInfo>, String> {
    let max_depth = maxDepth.min(20);
    run_blocking(move || scan_project_caches(&path, max_depth)).await
}

/// Clean a specific cache
#[tauri::command]
pub async fn clean_cache_cmd(path: String) -> Result<String, String> {
    run_blocking(move || clean_cache(&path)).await?
}

/// Clean multiple caches
#[tauri::command]
pub async fn clean_multiple_caches(
    paths: Vec<String>,
) -> Result<Vec<Result<String, String>>, String> {
    run_blocking(move || paths.into_iter().map(|path| clean_cache(&path)).collect()).await
}

/// Get total size of selected caches
#[tauri::command]
pub async fn get_total_cache_size(paths: Vec<String>) -> Result<String, String> {
    run_blocking(move || {
        let total: u64 = paths
            .iter()
            .filter_map(|p| {
                let path = std::path::PathBuf::from(p);
                if path.exists() {
                    Some(crate::cache::get_dir_size(&path))
                } else {
                    None
                }
            })
            .sum();

        crate::cache::format_size(total)
    })
    .await
}
