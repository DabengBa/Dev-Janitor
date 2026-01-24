//! Error handling for Dev Janitor

use thiserror::Error;

#[allow(dead_code)]
#[derive(Error, Debug)]
pub enum DevJanitorError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Command execution failed: {0}")]
    CommandFailed(String),

    #[error("Tool not found: {0}")]
    ToolNotFound(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

impl serde::Serialize for DevJanitorError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
