//! Chat History Tauri commands

use super::super::chat_history::{
    delete_chat_file, delete_project_chat_history, scan_chat_history, scan_global_chat_history,
    ChatHistoryFile, ProjectChatHistory,
};
use super::run_blocking;

/// Scan for projects with AI chat history
#[tauri::command]
pub async fn scan_chat_history_cmd(
    path: String,
    #[allow(non_snake_case)] maxDepth: usize,
) -> Result<Vec<ProjectChatHistory>, String> {
    let max_depth = maxDepth.min(20);
    run_blocking(move || scan_chat_history(&path, max_depth)).await
}

/// Scan global AI chat history locations
#[tauri::command]
pub async fn scan_global_chat_history_cmd() -> Result<Vec<ChatHistoryFile>, String> {
    run_blocking(scan_global_chat_history).await
}

/// Delete a single chat history file or directory
#[tauri::command]
pub async fn delete_chat_file_cmd(path: String) -> Result<String, String> {
    run_blocking(move || delete_chat_file(&path)).await?
}

/// Delete all chat history for a project
#[tauri::command]
pub async fn delete_project_chat_history_cmd(
    project_path: String,
) -> Result<(u32, u32, String), String> {
    run_blocking(move || delete_project_chat_history(&project_path)).await?
}

/// Delete multiple chat history files
#[tauri::command]
pub async fn delete_multiple_chat_files(
    paths: Vec<String>,
) -> Result<(u32, u32, Vec<String>), String> {
    run_blocking(move || {
        let mut success_count = 0u32;
        let mut fail_count = 0u32;
        let mut errors = Vec::new();

        for path in paths {
            match delete_chat_file(&path) {
                Ok(_) => success_count += 1,
                Err(e) => {
                    fail_count += 1;
                    errors.push(e);
                }
            }
        }

        (success_count, fail_count, errors)
    })
    .await
}
