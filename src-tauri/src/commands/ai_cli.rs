//! Tauri commands for AI CLI tools management

use super::run_blocking;
use crate::ai_cli::{
    get_ai_cli_tools, install_ai_tool, uninstall_ai_tool, update_ai_tool, AiCliTool,
};

/// Get all AI CLI tools with status
#[tauri::command]
pub async fn get_ai_cli_tools_cmd() -> Result<Vec<AiCliTool>, String> {
    run_blocking(get_ai_cli_tools).await
}

/// Install an AI CLI tool
#[tauri::command]
pub async fn install_ai_tool_cmd(
    #[allow(non_snake_case)] toolId: String,
) -> Result<String, String> {
    run_blocking(move || install_ai_tool(&toolId)).await?
}

/// Update an AI CLI tool
#[tauri::command]
pub async fn update_ai_tool_cmd(#[allow(non_snake_case)] toolId: String) -> Result<String, String> {
    run_blocking(move || update_ai_tool(&toolId)).await?
}

/// Uninstall an AI CLI tool
#[tauri::command]
pub async fn uninstall_ai_tool_cmd(
    #[allow(non_snake_case)] toolId: String,
) -> Result<String, String> {
    run_blocking(move || uninstall_ai_tool(&toolId)).await?
}
