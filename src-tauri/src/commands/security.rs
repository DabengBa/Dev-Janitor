//! Tauri commands for AI tool security scanning

use super::run_blocking;
use crate::security_scan::{
    get_rules, scan_ai_tool_security, scan_specific_tool, SecurityScanResult,
};

/// Perform a full security scan of all AI tools
#[tauri::command]
pub async fn scan_security_cmd() -> Result<SecurityScanResult, String> {
    run_blocking(scan_ai_tool_security).await
}

/// Get list of supported tools for scanning  
#[tauri::command]
pub async fn get_security_tools_cmd() -> Result<Vec<SecurityToolInfo>, String> {
    run_blocking(|| {
        get_rules()
            .iter()
            .map(|t| SecurityToolInfo {
                id: t.id.clone(),
                name: t.name.clone(),
                description: t.description.clone(),
                docs_url: t.docs_url.clone(),
                port_count: t.ports.len(),
                config_check_count: t.configs.len(),
            })
            .collect()
    })
    .await
}

/// Scan a specific tool only
#[tauri::command]
pub async fn scan_tool_security_cmd(
    #[allow(non_snake_case)] toolId: String,
) -> Result<Option<SecurityScanResult>, String> {
    run_blocking(move || scan_specific_tool(&toolId)).await
}

/// Tool info for frontend display
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SecurityToolInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub docs_url: String,
    pub port_count: usize,
    pub config_check_count: usize,
}
