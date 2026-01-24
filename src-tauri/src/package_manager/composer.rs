//! Composer (PHP) package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;

use crate::utils::command::command_no_window;

pub struct ComposerManager {
    version: String,
}

#[derive(Deserialize)]
struct ComposerPackage {
    name: String,
    version: String,
    description: Option<String>,
}

impl ComposerManager {
    pub fn new() -> Option<Self> {
        let output = run_composer_command(&["--version"])?;
        // Extract version from "Composer version X.Y.Z ..."
        let version = output
            .split_whitespace()
            .nth(2)
            .unwrap_or("unknown")
            .to_string();
        Some(Self { version })
    }
}

impl PackageManager for ComposerManager {
    fn name(&self) -> &str {
        "composer"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let mut packages = Vec::new();

        // Get global packages
        let output = match run_composer_command(&["global", "show", "--format=json"]) {
            Some(o) => o,
            None => return packages,
        };

        #[derive(Deserialize)]
        struct ComposerShowOutput {
            installed: Option<Vec<ComposerPackage>>,
        }

        let show: ComposerShowOutput = match serde_json::from_str(&output) {
            Ok(s) => s,
            Err(_) => return packages,
        };

        if let Some(installed) = show.installed {
            for pkg in installed {
                packages.push(PackageInfo {
                    name: pkg.name,
                    version: pkg.version,
                    latest: None,
                    manager: "composer".to_string(),
                    is_outdated: false,
                    description: pkg.description,
                });
            }
        }

        packages
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        match run_composer_command(&["global", "update", name]) {
            Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to update {}", name)),
        }
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        match run_composer_command(&["global", "remove", name]) {
            Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to uninstall {}", name)),
        }
    }
}

fn run_composer_command(args: &[&str]) -> Option<String> {
    let output = command_no_window("composer").args(args).output().ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}
