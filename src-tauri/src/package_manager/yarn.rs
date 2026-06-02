//! Yarn package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;
use serde_json::Value;
use std::time::Duration;

use crate::utils::command::command_output_with_timeout_vec;

pub struct YarnManager {
    version: String,
    command: YarnCommand,
}

#[derive(Clone)]
struct YarnCommand {
    program: String,
    prefix_args: Vec<String>,
}

impl YarnCommand {
    fn new(program: &str, prefix_args: &[&str]) -> Self {
        Self {
            program: program.to_string(),
            prefix_args: prefix_args.iter().map(|arg| arg.to_string()).collect(),
        }
    }
}

#[derive(Deserialize)]
struct YarnJsonLine {
    #[serde(rename = "type")]
    line_type: String,
    data: Value,
}

impl YarnManager {
    pub fn new() -> Option<Self> {
        let candidates = [
            YarnCommand::new("yarn", &[]),
            YarnCommand::new("corepack", &["yarn"]),
        ];

        for command in candidates {
            if let Some(output) = run_yarn_command(&command, &["--version"]) {
                return Some(Self {
                    version: output.trim().to_string(),
                    command,
                });
            }
        }

        None
    }
}

impl PackageManager for YarnManager {
    fn name(&self) -> &str {
        "yarn"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let output =
            match run_yarn_command(&self.command, &["global", "list", "--depth=0", "--json"]) {
                Some(output) => output,
                None => return Vec::new(),
            };

        parse_yarn_global_list(&output)
            .into_iter()
            .map(|pkg| PackageInfo {
                name: pkg.name,
                version: pkg.version,
                latest: None,
                manager: "yarn".to_string(),
                is_outdated: false,
                description: None,
            })
            .collect()
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        match run_yarn_command(&self.command, &["global", "add", &format!("{name}@latest")]) {
            Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to update {}", name)),
        }
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        match run_yarn_command(&self.command, &["global", "remove", name]) {
            Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to uninstall {}", name)),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
struct ParsedYarnPackage {
    name: String,
    version: String,
}

fn parse_yarn_global_list(output: &str) -> Vec<ParsedYarnPackage> {
    let mut packages = Vec::new();

    for line in output.lines() {
        let Ok(parsed) = serde_json::from_str::<YarnJsonLine>(line) else {
            continue;
        };

        if parsed.line_type != "tree" && parsed.line_type != "list" {
            continue;
        }

        let trees = parsed
            .data
            .get("trees")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();

        for tree in trees {
            let Some(name_with_version) = tree.get("name").and_then(Value::as_str) else {
                continue;
            };

            if let Some((name, version)) = split_yarn_name_version(name_with_version) {
                packages.push(ParsedYarnPackage { name, version });
            }
        }
    }

    packages.sort_by(|left, right| left.name.cmp(&right.name));
    packages
}

fn split_yarn_name_version(input: &str) -> Option<(String, String)> {
    let split_index = input.rfind('@')?;
    if split_index == 0 {
        return None;
    }

    let name = &input[..split_index];
    let version = &input[split_index + 1..];
    if name.is_empty() || version.is_empty() {
        return None;
    }

    Some((name.to_string(), version.to_string()))
}

fn run_yarn_command(command: &YarnCommand, args: &[&str]) -> Option<String> {
    let mut full_args = command.prefix_args.clone();
    full_args.extend(args.iter().map(|arg| arg.to_string()));

    let output =
        command_output_with_timeout_vec(&command.program, &full_args, Duration::from_secs(30))
            .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_yarn_classic_tree_lines() {
        let output = r#"
{"type":"tree","data":{"type":"list","trees":[{"name":"eslint@8.57.1","children":[]},{"name":"@scope/tool@1.2.3","children":[]}]}}
{"type":"info","data":"Done"}
"#;

        let packages = parse_yarn_global_list(output);
        assert_eq!(packages.len(), 2);
        assert_eq!(packages[0].name, "@scope/tool");
        assert_eq!(packages[0].version, "1.2.3");
        assert_eq!(packages[1].name, "eslint");
        assert_eq!(packages[1].version, "8.57.1");
    }
}
