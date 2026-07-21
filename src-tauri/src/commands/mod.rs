//! Tauri command modules

pub mod ai_cleanup;
pub mod ai_cli;
pub mod cache;
pub mod chat_history;
pub mod config;
pub mod packages;
pub mod security;
pub mod services;
pub mod tools;

/// Run filesystem and subprocess-heavy work away from Tauri's UI thread.
pub(crate) async fn run_blocking<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| format!("Background task failed: {error}"))
}

pub use ai_cleanup::*;
pub use ai_cli::*;
pub use cache::*;
pub use chat_history::*;
pub use config::*;
pub use packages::*;
pub use security::*;
pub use services::*;
pub use tools::*;
