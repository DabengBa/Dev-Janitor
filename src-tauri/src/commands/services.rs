//! Tauri commands for service monitoring

use super::run_blocking;
use crate::services::{
    get_all_processes, get_common_dev_ports, get_dev_processes, get_ports_in_use, kill_process,
    PortInfo, ProcessInfo,
};

/// Get all development-related processes
#[tauri::command]
pub async fn get_dev_processes_cmd() -> Result<Vec<ProcessInfo>, String> {
    run_blocking(get_dev_processes).await
}

/// Get all running processes
#[tauri::command]
pub async fn get_all_processes_cmd() -> Result<Vec<ProcessInfo>, String> {
    run_blocking(get_all_processes).await
}

/// Kill a process by PID
#[tauri::command]
pub async fn kill_process_cmd(pid: u32) -> Result<String, String> {
    run_blocking(move || kill_process(pid)).await?
}

/// Get all ports in use
#[tauri::command]
pub async fn get_ports_cmd() -> Result<Vec<PortInfo>, String> {
    run_blocking(get_ports_in_use).await
}

/// Get common dev ports
#[tauri::command]
pub async fn get_common_dev_ports_cmd() -> Result<Vec<PortInfo>, String> {
    run_blocking(get_common_dev_ports).await
}
