//! Homebrew package manager support (macOS only)

use super::{PackageInfo, PackageManager};
#[cfg(target_os = "macos")]
use std::process::Command;

pub struct HomebrewManager {
    version: String,
}

impl HomebrewManager {
    #[cfg(target_os = "macos")]
    pub fn new() -> Option<Self> {
        let output = run_brew_command(&["--version"])?;
        // Extract version from "Homebrew X.Y.Z"
        let version = output
            .lines()
            .next()
            .and_then(|line| line.split_whitespace().nth(1))
            .unwrap_or("unknown")
            .to_string();
        Some(Self { version })
    }

    #[cfg(not(target_os = "macos"))]
    pub fn new() -> Option<Self> {
        None
    }
}

impl PackageManager for HomebrewManager {
    fn name(&self) -> &str {
        "homebrew"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        #[cfg(target_os = "macos")]
        {
            let mut packages = Vec::new();

            // Get installed formulae
            let output = match run_brew_command(&["list", "--formula", "--versions"]) {
                Some(o) => o,
                None => return packages,
            };

            // Get outdated packages
            let outdated_output = run_brew_command(&["outdated", "--formula"]).unwrap_or_default();
            let outdated_names: std::collections::HashSet<String> = outdated_output
                .lines()
                .map(|l| l.split_whitespace().next().unwrap_or("").to_string())
                .collect();

            // Parse "package version" format
            for line in output.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[0].to_string();
                    let version = parts[1].to_string();
                    let is_outdated = outdated_names.contains(&name);

                    packages.push(PackageInfo {
                        name,
                        version,
                        latest: None,
                        manager: "homebrew".to_string(),
                        is_outdated,
                        description: None,
                    });
                }
            }

            packages
        }

        #[cfg(not(target_os = "macos"))]
        Vec::new()
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        #[cfg(target_os = "macos")]
        {
            match run_brew_command(&["upgrade", name]) {
                Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
                None => Err(format!("Failed to update {}", name)),
            }
        }

        #[cfg(not(target_os = "macos"))]
        Err("Homebrew is only available on macOS".to_string())
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        #[cfg(target_os = "macos")]
        {
            match run_brew_command(&["uninstall", name]) {
                Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
                None => Err(format!("Failed to uninstall {}", name)),
            }
        }

        #[cfg(not(target_os = "macos"))]
        Err("Homebrew is only available on macOS".to_string())
    }
}

#[cfg(target_os = "macos")]
fn run_brew_command(args: &[&str]) -> Option<String> {
    let output = Command::new("brew").args(args).output().ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}

#[cfg(not(target_os = "macos"))]
fn run_brew_command(_args: &[&str]) -> Option<String> {
    None
}
