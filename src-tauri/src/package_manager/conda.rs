//! Conda package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;

use crate::utils::command::command_output_with_timeout;
use std::time::Duration;

pub struct CondaManager {
    version: String,
}

#[derive(Deserialize)]
struct CondaPackage {
    name: String,
    version: String,
    channel: Option<String>,
}

impl CondaManager {
    pub fn new() -> Option<Self> {
        let output = run_conda_command(&["--version"])?;
        // Extract version from "conda X.Y.Z"
        let version = output
            .split_whitespace()
            .nth(1)
            .unwrap_or("unknown")
            .to_string();
        Some(Self { version })
    }
}

impl PackageManager for CondaManager {
    fn name(&self) -> &str {
        "conda"
    }
    
    fn is_available(&self) -> bool {
        true
    }
    
    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }
    
    fn list_packages(&self) -> Vec<PackageInfo> {
        let mut packages = Vec::new();
        
        // Get packages in base environment
        let output = match run_conda_command(&["list", "--json"]) {
            Some(o) => o,
            None => return packages,
        };
        
        let list: Vec<CondaPackage> = match serde_json::from_str(&output) {
            Ok(l) => l,
            Err(_) => return packages,
        };
        
        for pkg in list {
            // Skip conda system packages
            if pkg.name.starts_with("_") || pkg.name == "conda" || pkg.name == "python" {
                continue;
            }
            
            packages.push(PackageInfo {
                name: pkg.name,
                version: pkg.version,
                latest: None,
                manager: "conda".to_string(),
                is_outdated: false,
                description: pkg.channel,
            });
        }
        
        packages
    }
    
    fn update_package(&self, name: &str) -> Result<String, String> {
        match run_conda_command(&["update", "-y", name]) {
            Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to update {}", name)),
        }
    }
    
    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        match run_conda_command(&["remove", "-y", name]) {
            Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to uninstall {}", name)),
        }
    }
}

fn run_conda_command(args: &[&str]) -> Option<String> {
    let output = command_output_with_timeout("conda", args, Duration::from_secs(30)).ok()?;
    
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}
