//! Tauri commands for AI junk cleanup

use super::run_blocking;
use crate::ai_cleanup::{delete_ai_junk, scan_ai_junk, AiJunkFile};

/// Scan a directory for AI junk files
#[tauri::command]
pub async fn scan_ai_junk_cmd(
    path: String,
    #[allow(non_snake_case)] maxDepth: usize,
) -> Result<Vec<AiJunkFile>, String> {
    let max_depth = maxDepth.min(20);
    run_blocking(move || scan_ai_junk(&path, max_depth)).await
}

/// Delete an AI junk file
#[tauri::command]
pub async fn delete_ai_junk_cmd(path: String) -> Result<String, String> {
    run_blocking(move || delete_ai_junk(&path)).await?
}

/// Delete multiple AI junk files
#[tauri::command]
pub async fn delete_multiple_ai_junk(
    paths: Vec<String>,
) -> Result<Vec<Result<String, String>>, String> {
    run_blocking(move || {
        paths
            .into_iter()
            .map(|path| delete_ai_junk(&path))
            .collect()
    })
    .await
}
