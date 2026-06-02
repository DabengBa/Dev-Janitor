//! pnpm package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;

use crate::utils::command::command_output_with_timeout_vec;

pub struct PnpmManager {
    version: String,
    command: NodePackageCommand,
}

#[derive(Clone)]
struct NodePackageCommand {
    program: String,
    prefix_args: Vec<String>,
}

impl NodePackageCommand {
    fn new(program: &str, prefix_args: &[&str]) -> Self {
        Self {
            program: program.to_string(),
            prefix_args: prefix_args.iter().map(|arg| arg.to_string()).collect(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct PnpmPackage {
    version: Option<String>,
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PnpmOutdatedPackage {
    latest: Option<String>,
}

impl PnpmManager {
    pub fn new() -> Option<Self> {
        let candidates = [
            NodePackageCommand::new("pnpm", &[]),
            NodePackageCommand::new("corepack", &["pnpm"]),
        ];

        for command in candidates {
            if let Some(output) = run_pnpm_command(&command, &["--version"]) {
                return Some(Self {
                    version: output.trim().to_string(),
                    command,
                });
            }
        }

        None
    }
}

impl PackageManager for PnpmManager {
    fn name(&self) -> &str {
        "pnpm"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let output = match run_pnpm_command(&self.command, &["list", "-g", "--depth=0", "--json"]) {
            Some(output) => output,
            None => return Vec::new(),
        };

        let outdated_output = run_pnpm_command(&self.command, &["outdated", "-g", "--format=json"])
            .unwrap_or_default();
        let outdated: HashMap<String, PnpmOutdatedPackage> =
            serde_json::from_str(&outdated_output).unwrap_or_default();

        parse_pnpm_list(&output)
            .into_iter()
            .filter(|pkg| pkg.name != "pnpm")
            .map(|pkg| {
                let latest = outdated
                    .get(&pkg.name)
                    .and_then(|entry| entry.latest.clone());
                PackageInfo {
                    name: pkg.name,
                    version: pkg.version,
                    latest: latest.clone(),
                    manager: "pnpm".to_string(),
                    is_outdated: latest.is_some(),
                    description: pkg.path,
                }
            })
            .collect()
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        match run_pnpm_command(&self.command, &["update", "-g", name]) {
            Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to update {}", name)),
        }
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        match run_pnpm_command(&self.command, &["remove", "-g", name]) {
            Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to uninstall {}", name)),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
struct ParsedPnpmPackage {
    name: String,
    version: String,
    path: Option<String>,
}

fn parse_pnpm_list(output: &str) -> Vec<ParsedPnpmPackage> {
    let value: Value = match serde_json::from_str(output) {
        Ok(value) => value,
        Err(_) => return Vec::new(),
    };

    let projects = match value {
        Value::Array(projects) => projects,
        project @ Value::Object(_) => vec![project],
        _ => return Vec::new(),
    };

    let mut packages = Vec::new();

    for project in projects {
        let Some(dependencies) = project.get("dependencies") else {
            continue;
        };

        if let Ok(map) =
            serde_json::from_value::<HashMap<String, PnpmPackage>>(dependencies.clone())
        {
            for (name, pkg) in map {
                if let Some(version) = pkg.version {
                    packages.push(ParsedPnpmPackage {
                        name,
                        version,
                        path: pkg.path,
                    });
                }
            }
            continue;
        }

        if let Some(list) = dependencies.as_array() {
            for item in list {
                let Some(name) = item.get("name").and_then(Value::as_str) else {
                    continue;
                };
                let Some(version) = item.get("version").and_then(Value::as_str) else {
                    continue;
                };

                packages.push(ParsedPnpmPackage {
                    name: name.to_string(),
                    version: version.to_string(),
                    path: item
                        .get("path")
                        .and_then(Value::as_str)
                        .map(|path| path.to_string()),
                });
            }
        }
    }

    packages.sort_by(|left, right| left.name.cmp(&right.name));
    packages
}

fn run_pnpm_command(command: &NodePackageCommand, args: &[&str]) -> Option<String> {
    let mut full_args = command.prefix_args.clone();
    full_args.extend(args.iter().map(|arg| arg.to_string()));

    let output =
        command_output_with_timeout_vec(&command.program, &full_args, Duration::from_secs(30))
            .ok()?;

    if output.status.success() || args.contains(&"outdated") {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_pnpm_dependency_object() {
        let output = r#"
        [{
          "path": "/tmp/global",
          "dependencies": {
            "@scope/tool": {"version": "1.2.3", "path": "/tmp/global/node_modules/@scope/tool"},
            "plain": {"version": "4.5.6"}
          }
        }]
        "#;

        let packages = parse_pnpm_list(output);
        assert_eq!(packages.len(), 2);
        assert_eq!(packages[0].name, "@scope/tool");
        assert_eq!(packages[0].version, "1.2.3");
        assert_eq!(packages[1].name, "plain");
    }
}
