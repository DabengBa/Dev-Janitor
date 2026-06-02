//! Tauri commands for package management

use crate::package_manager::{cargo, composer, conda, npm, pip, pnpm, yarn};
use crate::package_manager::{scan_all_packages, PackageInfo, PackageManager};

/// Scan all package managers for installed packages
#[tauri::command]
pub fn scan_packages() -> Vec<PackageInfo> {
    scan_all_packages()
}

/// Update a package
#[tauri::command]
pub fn update_package(manager: String, name: String) -> Result<String, String> {
    match manager.as_str() {
        "npm" => {
            if let Some(m) = npm::NpmManager::new() {
                m.update_package(&name)
            } else {
                Err("npm is not available".to_string())
            }
        }
        "pnpm" => {
            if let Some(m) = pnpm::PnpmManager::new() {
                m.update_package(&name)
            } else {
                Err("pnpm is not available".to_string())
            }
        }
        "yarn" => {
            if let Some(m) = yarn::YarnManager::new() {
                m.update_package(&name)
            } else {
                Err("yarn is not available".to_string())
            }
        }
        "pip" => {
            if let Some(m) = pip::PipManager::new() {
                m.update_package(&name)
            } else {
                Err("pip is not available".to_string())
            }
        }
        "cargo" => {
            if let Some(m) = cargo::CargoManager::new() {
                m.update_package(&name)
            } else {
                Err("cargo is not available".to_string())
            }
        }
        "composer" => {
            if let Some(m) = composer::ComposerManager::new() {
                m.update_package(&name)
            } else {
                Err("composer is not available".to_string())
            }
        }
        "conda" => {
            if let Some(m) = conda::CondaManager::new() {
                m.update_package(&name)
            } else {
                Err("conda is not available".to_string())
            }
        }
        "homebrew" => {
            use crate::package_manager::homebrew;
            if let Some(m) = homebrew::HomebrewManager::new() {
                m.update_package(&name)
            } else {
                Err("homebrew is not available".to_string())
            }
        }
        _ => Err(format!("Unknown package manager: {}", manager)),
    }
}

/// Uninstall a package
#[tauri::command]
pub fn uninstall_package(manager: String, name: String) -> Result<String, String> {
    match manager.as_str() {
        "npm" => {
            if let Some(m) = npm::NpmManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("npm is not available".to_string())
            }
        }
        "pnpm" => {
            if let Some(m) = pnpm::PnpmManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("pnpm is not available".to_string())
            }
        }
        "yarn" => {
            if let Some(m) = yarn::YarnManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("yarn is not available".to_string())
            }
        }
        "pip" => {
            if let Some(m) = pip::PipManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("pip is not available".to_string())
            }
        }
        "cargo" => {
            if let Some(m) = cargo::CargoManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("cargo is not available".to_string())
            }
        }
        "composer" => {
            if let Some(m) = composer::ComposerManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("composer is not available".to_string())
            }
        }
        "conda" => {
            if let Some(m) = conda::CondaManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("conda is not available".to_string())
            }
        }
        "homebrew" => {
            use crate::package_manager::homebrew;
            if let Some(m) = homebrew::HomebrewManager::new() {
                m.uninstall_package(&name)
            } else {
                Err("homebrew is not available".to_string())
            }
        }
        _ => Err(format!("Unknown package manager: {}", manager)),
    }
}
