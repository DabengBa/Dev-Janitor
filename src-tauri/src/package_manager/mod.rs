//! Package manager module for Dev Janitor v2
//! Supports npm, pip, Cargo, Composer, Homebrew, Conda, etc.

pub mod cargo;
pub mod composer;
pub mod conda;
pub mod homebrew;
pub mod npm;
pub mod pip;
pub mod pnpm;
pub mod yarn;

use rayon::prelude::*;
use serde::{Deserialize, Serialize};

/// Represents a global package from any package manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub latest: Option<String>,
    pub manager: String,
    pub is_outdated: bool,
    pub description: Option<String>,
}

/// Common trait for all package managers
pub trait PackageManager {
    /// Get the name of this package manager
    fn name(&self) -> &str;

    /// Check if this package manager is available on the system
    fn is_available(&self) -> bool;

    /// Get the version of this package manager
    fn get_version(&self) -> Option<String>;

    /// List all global packages
    fn list_packages(&self) -> Vec<PackageInfo>;

    /// Update a package to the latest version
    fn update_package(&self, name: &str) -> Result<String, String>;

    /// Uninstall a package
    fn uninstall_package(&self, name: &str) -> Result<String, String>;
}

type PackageScanFn = fn() -> Vec<PackageInfo>;

fn scan_npm_packages() -> Vec<PackageInfo> {
    npm::NpmManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_pnpm_packages() -> Vec<PackageInfo> {
    pnpm::PnpmManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_yarn_packages() -> Vec<PackageInfo> {
    yarn::YarnManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_pip_packages() -> Vec<PackageInfo> {
    pip::PipManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_cargo_packages() -> Vec<PackageInfo> {
    cargo::CargoManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_composer_packages() -> Vec<PackageInfo> {
    composer::ComposerManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_homebrew_packages() -> Vec<PackageInfo> {
    homebrew::HomebrewManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_conda_packages() -> Vec<PackageInfo> {
    conda::CondaManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

/// Scan all available package managers and list their packages
pub fn scan_all_packages() -> Vec<PackageInfo> {
    let package_scanners: [PackageScanFn; 8] = [
        scan_npm_packages,
        scan_pnpm_packages,
        scan_yarn_packages,
        scan_pip_packages,
        scan_cargo_packages,
        scan_composer_packages,
        scan_homebrew_packages,
        scan_conda_packages,
    ];

    let mut all_packages: Vec<PackageInfo> = package_scanners
        .par_iter()
        .flat_map(|scan| scan())
        .collect();

    all_packages.sort_by(|left, right| {
        left.manager
            .cmp(&right.manager)
            .then_with(|| left.name.cmp(&right.name))
    });

    all_packages
}
