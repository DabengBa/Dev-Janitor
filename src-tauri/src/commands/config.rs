//! Tauri commands for environment configuration diagnostics

use super::run_blocking;
use crate::config::{
    analyze_path, diagnose_environment, get_path_cleanup_suggestions, get_shell_configs,
    EnvDiagnosis, PathEntry, ShellConfig,
};

/// Analyze current PATH
#[tauri::command]
pub async fn analyze_path_cmd() -> Result<Vec<PathEntry>, String> {
    run_blocking(analyze_path).await
}

/// Get shell configuration files
#[tauri::command]
pub async fn get_shell_configs_cmd() -> Result<Vec<ShellConfig>, String> {
    run_blocking(get_shell_configs).await
}

/// Run full environment diagnosis
#[tauri::command]
pub async fn diagnose_env_cmd() -> Result<EnvDiagnosis, String> {
    run_blocking(diagnose_environment).await
}

/// Get PATH cleanup suggestions
#[tauri::command]
pub async fn get_path_suggestions_cmd() -> Result<Vec<String>, String> {
    run_blocking(|| {
        let entries = analyze_path();
        get_path_cleanup_suggestions(&entries)
    })
    .await
}
