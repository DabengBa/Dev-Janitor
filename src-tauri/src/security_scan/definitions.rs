//! Security rule definitions for AI coding tools
//!
//! This file contains all the security rules that define what to check for each AI tool.
//! To add support for a new tool, simply add a new entry to `get_ai_tool_rules()`.

use serde::{Deserialize, Serialize};

/// Risk level classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Critical, // Immediate action required - exposed API keys, RCE risk
    High,     // Serious issue - exposed admin interface, auth bypass
    Medium,   // Should fix - insecure default config
    Low,      // Informational - best practice recommendation
}

impl RiskLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Critical => "Critical",
            RiskLevel::High => "High",
            RiskLevel::Medium => "Medium",
            RiskLevel::Low => "Low",
        }
    }

    pub fn emoji(&self) -> &'static str {
        match self {
            RiskLevel::Critical => "🔴",
            RiskLevel::High => "🟠",
            RiskLevel::Medium => "🟡",
            RiskLevel::Low => "🔵",
        }
    }
}

/// Type of configuration check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConfigCheckType {
    /// Check if file exists (presence = bad)
    FileExists { path_pattern: String },
    /// Check if file contains a pattern
    FileContains {
        path_pattern: String,
        pattern: String,
    },
    /// Check if file does NOT contain expected secure pattern
    FileMissing {
        path_pattern: String,
        pattern: String,
    },
    /// Check environment variable
    EnvVar {
        name: String,
        insecure_value: Option<String>,
    },
}

/// Port exposure rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortRule {
    pub port: u16,
    pub name: String,
    pub description: String,
    pub risk_if_exposed: RiskLevel,
    /// Acceptable if bound to these addresses only
    pub safe_bindings: Vec<String>,
}

/// Configuration vulnerability rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigRule {
    pub name: String,
    pub description: String,
    pub check: ConfigCheckType,
    pub risk_level: RiskLevel,
    pub remediation: String,
}

/// Security rule definition for an AI tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiToolSecurityRule {
    /// Tool identifier (e.g., "clawdbot", "opencode", "aider")
    pub id: String,
    /// Display name
    pub name: String,
    /// Tool description
    pub description: String,
    /// Official website/docs
    pub docs_url: String,
    /// Process names to detect (lowercase)
    pub process_names: Vec<String>,
    /// Ports to check
    pub ports: Vec<PortRule>,
    /// Config files/patterns to check
    pub configs: Vec<ConfigRule>,
    /// Common config file locations (relative to home or absolute)
    pub config_paths: Vec<String>,
}

/// A security finding from the scan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityFinding {
    pub tool_id: String,
    pub tool_name: String,
    pub issue: String,
    pub description: String,
    pub risk_level: RiskLevel,
    pub remediation: String,
    pub details: String, // e.g., "Port 18789 bound to 0.0.0.0"
}

/// Result of a security scan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityScanResult {
    pub scan_time: String,
    pub tools_scanned: Vec<String>,
    pub findings: Vec<SecurityFinding>,
    pub summary: SecuritySummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySummary {
    pub total_findings: usize,
    pub critical: usize,
    pub high: usize,
    pub medium: usize,
    pub low: usize,
}

/// ========================================
/// AI TOOL SECURITY RULES - ADD NEW TOOLS HERE
/// ========================================
///
/// To add a new AI tool, add a new `AiToolSecurityRule` to this function.
/// The scanner will automatically include it in scans.
pub fn get_ai_tool_rules() -> Vec<AiToolSecurityRule> {
    vec![
        // =====================================
        // Clawdbot - AI Agent Gateway (Jan 2026 vulnerability)
        // =====================================
        AiToolSecurityRule {
            id: "clawdbot".into(),
            name: "Clawdbot".into(),
            description: "Open-source AI agent gateway with MCP support".into(),
            docs_url: "https://github.com/clawdbot/clawdbot".into(),
            process_names: vec!["clawdbot".into(), "clawdbot-server".into(), "clawdbot-gateway".into()],
            ports: vec![
                PortRule {
                    port: 18789,
                    name: "Clawdbot Gateway".into(),
                    description: "Primary gateway port - should NOT be exposed to internet".into(),
                    risk_if_exposed: RiskLevel::Critical,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into(), "::1".into()],
                },
                PortRule {
                    port: 18790,
                    name: "Clawdbot Control UI".into(),
                    description: "Admin web interface - exposes API keys and chat history".into(),
                    risk_if_exposed: RiskLevel::Critical,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into(), "::1".into()],
                },
            ],
            configs: vec![
                ConfigRule {
                    name: "Exposed trustedProxies".into(),
                    description: "trustedProxies may allow localhost auth bypass via reverse proxy".into(),
                    check: ConfigCheckType::FileMissing {
                        path_pattern: "**/clawdbot.config.*".into(),
                        pattern: "trustedProxies".into(),
                    },
                    risk_level: RiskLevel::High,
                    remediation: "Set gateway.trustedProxies to only trusted reverse proxy IPs".into(),
                },
                ConfigRule {
                    name: "API Keys in Config".into(),
                    description: "Anthropic/OpenAI API keys stored in plaintext config".into(),
                    check: ConfigCheckType::FileContains {
                        path_pattern: "**/clawdbot.config.*".into(),
                        pattern: "sk-ant-|sk-".into(),
                    },
                    risk_level: RiskLevel::High,
                    remediation: "Use environment variables for API keys instead of config files".into(),
                },
            ],
            config_paths: vec![
                ".clawdbot/".into(),
                ".config/clawdbot/".into(),
            ],
        },

        // =====================================
        // OpenCode - Terminal AI coding assistant
        // CVE-2026-22812: Unauthenticated HTTP server with wildcard CORS
        // =====================================
        AiToolSecurityRule {
            id: "opencode".into(),
            name: "OpenCode".into(),
            description: "Terminal-based AI coding assistant (CVE-2026-22812)".into(),
            docs_url: "https://opencode.ai/docs".into(),
            process_names: vec!["opencode".into()],
            ports: vec![
                PortRule {
                    port: 4096,
                    name: "OpenCode HTTP Server".into(),
                    description: "CVE-2026-22812: Unauthenticated HTTP server with CORS * - allows RCE from any website".into(),
                    risk_if_exposed: RiskLevel::Critical,
                    safe_bindings: vec!["127.0.0.1".into()],
                },
                PortRule {
                    port: 4097,
                    name: "OpenCode HTTP Server (alt)".into(),
                    description: "CVE-2026-22812: Alternative port when 4096 is in use".into(),
                    risk_if_exposed: RiskLevel::Critical,
                    safe_bindings: vec!["127.0.0.1".into()],
                },
                PortRule {
                    port: 8765,
                    name: "OpenCode Debug Server".into(),
                    description: "Debug/MCP server - should be localhost only".into(),
                    risk_if_exposed: RiskLevel::High,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into()],
                },
            ],
            configs: vec![
                ConfigRule {
                    name: "API Keys in Config".into(),
                    description: "API keys stored in opencode config".into(),
                    check: ConfigCheckType::FileContains {
                        path_pattern: "**/opencode.json*".into(),
                        pattern: "sk-".into(),
                    },
                    risk_level: RiskLevel::High,
                    remediation: "Use environment variables for API keys. Update to OpenCode >= 1.0.216 to fix CVE-2026-22812".into(),
                },
            ],
            config_paths: vec![
                ".opencode/".into(),
                ".config/opencode/".into(),
            ],
        },

        // =====================================
        // Aider - AI pair programming
        // =====================================
        AiToolSecurityRule {
            id: "aider".into(),
            name: "Aider".into(),
            description: "AI pair programming in your terminal".into(),
            docs_url: "https://aider.chat".into(),
            process_names: vec!["aider".into()],
            ports: vec![
                PortRule {
                    port: 8501,
                    name: "Aider Web UI".into(),
                    description: "Aider browser interface".into(),
                    risk_if_exposed: RiskLevel::Medium,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into()],
                },
            ],
            configs: vec![
                ConfigRule {
                    name: "API Keys in .aider.conf".into(),
                    description: "API keys in aider config file".into(),
                    check: ConfigCheckType::FileContains {
                        path_pattern: "**/.aider.conf*".into(),
                        pattern: "api_key".into(),
                    },
                    risk_level: RiskLevel::Medium,
                    remediation: "Use OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables".into(),
                },
            ],
            config_paths: vec![
                ".aider.conf.yml".into(),
                ".aider/".into(),
            ],
        },

        // =====================================
        // Claude Code - Anthropic official CLI
        // =====================================
        AiToolSecurityRule {
            id: "claude".into(),
            name: "Claude Code".into(),
            description: "Anthropic's official AI coding CLI".into(),
            docs_url: "https://code.claude.com/docs/en/install".into(),
            process_names: vec!["claude".into(), "claude-code".into()],
            ports: vec![
                PortRule {
                    port: 9222,
                    name: "Claude Code Debug Port".into(),
                    description: "Chrome DevTools debug protocol port".into(),
                    risk_if_exposed: RiskLevel::Critical,
                    safe_bindings: vec!["127.0.0.1".into()],
                },
            ],
            configs: vec![ConfigRule {
                name: "API Keys in Claude Config".into(),
                description: "API keys or tokens stored in Claude Code config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "sk-ant-|sk-|api_key|apiKey|access_token".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use provider environment variables or the tool's secure login flow instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".claude/".into(),
                ".claude.json".into(),
            ],
        },

        // =====================================
        // Codex CLI - OpenAI
        // =====================================
        AiToolSecurityRule {
            id: "codex".into(),
            name: "Codex CLI".into(),
            description: "OpenAI's Codex command-line tool".into(),
            docs_url: "https://developers.openai.com/codex/cli".into(),
            process_names: vec!["codex".into()],
            ports: vec![],
            configs: vec![
                ConfigRule {
                    name: "OpenAI API Key in config".into(),
                    description: "API key stored in codex config".into(),
                    check: ConfigCheckType::FileContains {
                        path_pattern: "**/.codex/config.toml".into(),
                        pattern: "sk-".into(),
                    },
                    risk_level: RiskLevel::Medium,
                    remediation: "Use OPENAI_API_KEY environment variable".into(),
                },
            ],
            config_paths: vec![
                ".codex/".into(),
                ".codex/config.toml".into(),
            ],
        },

        // =====================================
        // Goose CLI - AAIF local-first agent
        // =====================================
        AiToolSecurityRule {
            id: "goose".into(),
            name: "Goose CLI".into(),
            description: "Local-first extensible AI agent with MCP support".into(),
            docs_url: "https://goose-docs.ai/docs/getting-started/installation".into(),
            process_names: vec!["goose".into(), "goosed".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Goose Config".into(),
                description: "Provider API keys, auth tokens, or MCP credentials stored in Goose files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "sk-|api_key|apiKey|access_token|refresh_token|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|Authorization: Bearer".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use Goose's keyring-backed credential flow or environment-backed secrets instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".config/goose/".into(),
                ".local/share/goose/".into(),
                ".local/state/goose/".into(),
            ],
        },

        // =====================================
        // OpenHands CLI
        // =====================================
        AiToolSecurityRule {
            id: "openhands".into(),
            name: "OpenHands CLI".into(),
            description: "Open-source software development agent with CLI and web modes".into(),
            docs_url: "https://docs.openhands.dev/openhands/usage/cli/installation".into(),
            process_names: vec!["openhands".into()],
            ports: vec![PortRule {
                port: 12000,
                name: "OpenHands Web UI".into(),
                description: "OpenHands web mode defaults to host 0.0.0.0 and should not be exposed without trusted network controls".into(),
                risk_if_exposed: RiskLevel::High,
                safe_bindings: vec!["127.0.0.1".into(), "localhost".into(), "::1".into()],
            }],
            configs: vec![ConfigRule {
                name: "Provider Key in OpenHands Config".into(),
                description: "Provider API keys, auth tokens, or MCP headers stored in OpenHands files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "sk-|api_key|apiKey|access_token|refresh_token|OPENAI_API_KEY|ANTHROPIC_API_KEY|LLM_API_KEY|Authorization: Bearer".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use OpenHands secrets/settings flows or environment-backed secret storage instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".openhands/".into(),
            ],
        },

        // =====================================
        // Auggie CLI - Augment Code
        // =====================================
        AiToolSecurityRule {
            id: "auggie".into(),
            name: "Auggie CLI".into(),
            description: "Augment Code's terminal coding agent".into(),
            docs_url: "https://docs.augmentcode.com/cli/overview".into(),
            process_names: vec!["auggie".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Token in Auggie Config".into(),
                description: "Augment auth tokens, GitHub tokens, or provider keys stored in Auggie files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "AUGMENT_SESSION_AUTH|GITHUB_API_TOKEN|github_pat_|ghp_|sk-|api_key|apiKey|access_token|Authorization: Bearer".into(),
                },
                risk_level: RiskLevel::High,
                remediation: "Use Auggie's login flow or environment-backed secret storage instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".augment/".into(),
            ],
        },

        // =====================================
        // Kilo Code CLI
        // =====================================
        AiToolSecurityRule {
            id: "kilo".into(),
            name: "Kilo Code CLI".into(),
            description: "Kilo Code's terminal coding agent".into(),
            docs_url: "https://kilo.ai/docs/code-with-ai/platforms/cli".into(),
            process_names: vec!["kilo".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Kilo Config".into(),
                description: "Provider API keys or auth tokens stored in Kilo config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "KILO_API_KEY|KILOCODE_|OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-|api_key|apiKey|access_token|Authorization: Bearer".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Keep provider keys in environment variables or secret storage instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".config/kilo/".into(),
            ],
        },

        // =====================================
        // Junie CLI - JetBrains
        // =====================================
        AiToolSecurityRule {
            id: "junie".into(),
            name: "Junie CLI".into(),
            description: "JetBrains' terminal coding agent".into(),
            docs_url: "https://junie.jetbrains.com/docs/junie-cli.html".into(),
            process_names: vec!["junie".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Junie Config".into(),
                description: "Junie BYOK tokens or provider API keys stored in Junie files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "JUNIE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|sk-|api_key|apiKey|access_token|Authorization: Bearer".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use JUNIE_API_KEY or provider environment variables instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".junie/".into(),
            ],
        },

        // =====================================
        // Continue.dev - VS Code AI extension with local server
        // =====================================
        AiToolSecurityRule {
            id: "continue".into(),
            name: "Continue".into(),
            description: "Open-source AI code assistant (VS Code extension)".into(),
            docs_url: "https://docs.continue.dev/cli/quickstart".into(),
            process_names: vec!["continue".into()],
            ports: vec![
                PortRule {
                    port: 65432,
                    name: "Continue Local Server".into(),
                    description: "Continue's local model server".into(),
                    risk_if_exposed: RiskLevel::Medium,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into()],
                },
            ],
            configs: vec![],
            config_paths: vec![
                ".continue/".into(),
                ".continue/config.yaml".into(),
            ],
        },

        // =====================================
        // Cursor - AI-powered code editor
        // Supply chain attack via .vscode/tasks.json (Jan 2026)
        // =====================================
        AiToolSecurityRule {
            id: "cursor".into(),
            name: "Cursor".into(),
            description: "AI-first code editor based on VS Code".into(),
            docs_url: "https://docs.cursor.com/en/cli/installation".into(),
            process_names: vec!["cursor".into(), "cursor-helper".into()],
            ports: vec![
                PortRule {
                    port: 9229,
                    name: "Cursor Debug Port".into(),
                    description: "Node.js inspector port - allows remote code execution if exposed".into(),
                    risk_if_exposed: RiskLevel::Critical,
                    safe_bindings: vec!["127.0.0.1".into()],
                },
            ],
            configs: vec![
                ConfigRule {
                    name: "Workspace Trust Disabled".into(),
                    description: "Malicious .vscode/tasks.json can execute arbitrary code on project open".into(),
                    check: ConfigCheckType::FileMissing {
                        path_pattern: "**/settings.json".into(),
                        pattern: "security.workspace.trust".into(),
                    },
                    risk_level: RiskLevel::Medium,
                    remediation: "Enable Workspace Trust feature in Cursor settings. Audit .vscode/tasks.json in untrusted repos".into(),
                },
            ],
            config_paths: vec![
                ".cursor/".into(),
                ".cursor/cli-config.json".into(),
                ".vscode/".into(),
            ],
        },

        // =====================================
        // Windsurf - AI coding assistant
        // =====================================
        AiToolSecurityRule {
            id: "windsurf".into(),
            name: "Windsurf".into(),
            description: "Codeium's AI-powered IDE".into(),
            docs_url: "https://codeium.com/windsurf".into(),
            process_names: vec!["windsurf".into()],
            ports: vec![
                PortRule {
                    port: 42424,
                    name: "Windsurf Language Server".into(),
                    description: "AI language server port".into(),
                    risk_if_exposed: RiskLevel::Medium,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into()],
                },
            ],
            configs: vec![],
            config_paths: vec![
                ".windsurf/".into(),
            ],
        },

        // =====================================
        // MCP Servers - Model Context Protocol
        // 66% of MCP servers have credential leakage (Jan 2026)
        // =====================================
        AiToolSecurityRule {
            id: "mcp-servers".into(),
            name: "MCP Servers".into(),
            description: "Model Context Protocol servers - 36.7% vulnerable to SSRF (2026)".into(),
            docs_url: "https://modelcontextprotocol.io".into(),
            process_names: vec!["mcp-server".into(), "mcp".into()],
            ports: vec![
                PortRule {
                    port: 3000,
                    name: "MCP Server Default".into(),
                    description: "Common MCP server port - check for auth and CORS settings".into(),
                    risk_if_exposed: RiskLevel::High,
                    safe_bindings: vec!["127.0.0.1".into()],
                },
                PortRule {
                    port: 8080,
                    name: "MCP Server HTTP".into(),
                    description: "MCP HTTP server - verify authentication is enabled".into(),
                    risk_if_exposed: RiskLevel::High,
                    safe_bindings: vec!["127.0.0.1".into()],
                },
            ],
            configs: vec![
                ConfigRule {
                    name: "API Keys in MCP Config".into(),
                    description: "Credentials exposed via environment variables or config".into(),
                    check: ConfigCheckType::FileContains {
                        path_pattern: "**/mcp.json".into(),
                        pattern: "sk-|api_key|apiKey|API_KEY".into(),
                    },
                    risk_level: RiskLevel::Critical,
                    remediation: "Use secret management. Never store API keys in MCP config files".into(),
                },
            ],
            config_paths: vec![
                ".mcp/".into(),
                ".config/mcp/".into(),
            ],
        },

        // =====================================
        // Gemini CLI - Google AI
        // =====================================
        AiToolSecurityRule {
            id: "gemini".into(),
            name: "Gemini CLI".into(),
            description: "Google's Gemini AI coding assistant".into(),
            docs_url: "https://google-gemini.github.io/gemini-cli/".into(),
            process_names: vec!["gemini".into()],
            ports: vec![],
            configs: vec![
                ConfigRule {
                    name: "API Keys in Config".into(),
                    description: "Google API keys stored in config".into(),
                    check: ConfigCheckType::FileContains {
                        path_pattern: "**/.gemini/settings.json".into(),
                        pattern: "AIza".into(),
                    },
                    risk_level: RiskLevel::Medium,
                    remediation: "Use GOOGLE_API_KEY environment variable or gcloud auth".into(),
                },
            ],
            config_paths: vec![
                ".gemini/".into(),
                ".gemini/settings.json".into(),
            ],
        },

        // =====================================
        // GitHub Copilot CLI
        // =====================================
        AiToolSecurityRule {
            id: "copilot".into(),
            name: "GitHub Copilot CLI".into(),
            description: "GitHub Copilot standalone terminal assistant".into(),
            docs_url: "https://github.com/github/copilot-cli".into(),
            process_names: vec!["copilot".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "GitHub Token in Config".into(),
                description: "GitHub tokens or API keys stored in Copilot config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "ghp_|github_pat_|sk-|api_key|apiKey|access_token".into(),
                },
                risk_level: RiskLevel::High,
                remediation: "Use GitHub's authentication flow or environment-backed secrets instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".copilot/".into(),
                ".config/github-copilot/".into(),
            ],
        },

        // =====================================
        // Qwen Code
        // =====================================
        AiToolSecurityRule {
            id: "qwen".into(),
            name: "Qwen Code".into(),
            description: "Qwen terminal coding agent".into(),
            docs_url: "https://github.com/QwenLM/qwen-code".into(),
            process_names: vec!["qwen".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Qwen Config".into(),
                description: "Provider API keys stored in Qwen Code config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "DASHSCOPE_API_KEY|OPENAI_API_KEY|sk-|api_key|apiKey".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Keep provider keys in environment variables or secret storage, not committed config files".into(),
            }],
            config_paths: vec![
                ".qwen/".into(),
                ".config/qwen/".into(),
            ],
        },

        // =====================================
        // Cline CLI
        // =====================================
        AiToolSecurityRule {
            id: "cline".into(),
            name: "Cline CLI".into(),
            description: "Autonomous coding agent CLI from Cline".into(),
            docs_url: "https://cline.bot".into(),
            process_names: vec!["cline".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Cline Config".into(),
                description: "Provider API keys or auth tokens stored in Cline config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "sk-|api_key|apiKey|access_token|refresh_token|ANTHROPIC_API_KEY|OPENAI_API_KEY".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Keep provider keys in environment variables or secret storage instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".cline/".into(),
                ".config/cline/".into(),
            ],
        },

        // =====================================
        // Amp
        // =====================================
        AiToolSecurityRule {
            id: "amp".into(),
            name: "Amp".into(),
            description: "Sourcegraph's agentic coding tool for the terminal".into(),
            docs_url: "https://ampcode.com/".into(),
            process_names: vec!["amp".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Token in Amp Config".into(),
                description: "Access tokens or provider keys stored in Amp config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "sk-|api_key|apiKey|access_token|refresh_token".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use the tool's login flow or secret-backed environment variables instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".amp/".into(),
                ".config/amp/".into(),
            ],
        },

        // =====================================
        // Crush
        // =====================================
        AiToolSecurityRule {
            id: "crush".into(),
            name: "Crush".into(),
            description: "Charm's terminal AI coding agent".into(),
            docs_url: "https://charm.sh/crush".into(),
            process_names: vec!["crush".into()],
            ports: vec![
                PortRule {
                    port: 43557,
                    name: "Crush Local Server".into(),
                    description: "Local helper/API server should only bind to localhost".into(),
                    risk_if_exposed: RiskLevel::Medium,
                    safe_bindings: vec!["127.0.0.1".into(), "localhost".into(), "::1".into()],
                },
            ],
            configs: vec![ConfigRule {
                name: "Provider Key in Crush Config".into(),
                description: "Provider API keys stored in Crush config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "sk-|api_key|apiKey|access_token|ANTHROPIC_API_KEY|OPENAI_API_KEY".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Keep provider keys in environment variables or secret storage instead of plaintext config values".into(),
            }],
            config_paths: vec![
                ".crush/".into(),
                ".config/crush/".into(),
            ],
        },

        // =====================================
        // Sourcegraph Cody
        // =====================================
        AiToolSecurityRule {
            id: "cody".into(),
            name: "Sourcegraph Cody".into(),
            description: "Sourcegraph's coding assistant CLI".into(),
            docs_url: "https://sourcegraph.com/docs/cody/clients/install-cli".into(),
            process_names: vec!["cody".into(), "cody-agent".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Token in Cody Config".into(),
                description: "Sourcegraph access tokens stored in Cody configuration".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*.json".into(),
                    pattern: "accessToken|access_token|token|sgp_".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use Sourcegraph's login flow or a secret-backed environment variable".into(),
            }],
            config_paths: vec![".sourcegraph/".into(), ".cody/".into()],
        },

        // =====================================
        // Kiro CLI
        // =====================================
        AiToolSecurityRule {
            id: "kiro".into(),
            name: "Kiro CLI".into(),
            description: "AWS Kiro terminal coding agent".into(),
            docs_url: "https://kiro.dev/docs/cli/installation/".into(),
            process_names: vec!["kiro".into(), "kiro-cli".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "AWS Credentials in Kiro Config".into(),
                description: "AWS credentials or access tokens stored in Kiro settings".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "AKIA|ASIA|aws_access_key_id|aws_secret_access_key|access_token".into(),
                },
                risk_level: RiskLevel::High,
                remediation: "Use AWS SSO, profiles, or the AWS credential chain instead of plaintext secrets".into(),
            }],
            config_paths: vec![".kiro/".into()],
        },

        // =====================================
        // iFlow CLI
        // =====================================
        AiToolSecurityRule {
            id: "iflow".into(),
            name: "iFlow CLI".into(),
            description: "iFlow terminal AI assistant".into(),
            docs_url: "https://platform.iflow.cn/en/cli/quickstart".into(),
            process_names: vec!["iflow".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in iFlow Settings".into(),
                description: "Provider API keys stored in iFlow configuration".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*.json".into(),
                    pattern: "apiKey|api_key|accessToken|token|sk-".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use iFlow's login flow or environment-backed secrets".into(),
            }],
            config_paths: vec![".iflow/".into()],
        },

        // =====================================
        // Factory Droid
        // =====================================
        AiToolSecurityRule {
            id: "droid".into(),
            name: "Factory Droid".into(),
            description: "Factory's autonomous terminal coding agent".into(),
            docs_url: "https://docs.factory.ai/reference/cli-reference".into(),
            process_names: vec!["droid".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Droid Config".into(),
                description: "Provider API keys or access tokens stored in Droid settings".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "apiKey|api_key|access_token|sk-ant-|sk-".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use environment variables or the Factory login flow instead of plaintext keys".into(),
            }],
            config_paths: vec![".factory/".into()],
        },

        // =====================================
        // Mistral Vibe
        // =====================================
        AiToolSecurityRule {
            id: "vibe".into(),
            name: "Mistral Vibe".into(),
            description: "Mistral's open-source terminal coding agent".into(),
            docs_url: "https://docs.mistral.ai/vibe/code/cli/install-setup".into(),
            process_names: vec!["vibe".into(), "vibe-acp".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "API Key in Vibe Config".into(),
                description: "Mistral or provider API keys stored in Vibe configuration".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*.toml".into(),
                    pattern: "api_key|apiKey|token|sk-".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Prefer MISTRAL_API_KEY or another secret-backed environment variable".into(),
            }],
            config_paths: vec![".vibe/".into()],
        },

        // =====================================
        // Qoder CLI
        // =====================================
        AiToolSecurityRule {
            id: "qoder".into(),
            name: "Qoder CLI".into(),
            description: "Qoder's agentic terminal coding interface".into(),
            docs_url: "https://docs.qoder.com/en/cli/quick-start".into(),
            process_names: vec!["qodercli".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Secret in Qoder Settings".into(),
                description: "API keys or access tokens stored in Qoder settings".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "apiKey|api_key|access_token|token|sk-".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use Qoder's login flow or environment-backed secrets".into(),
            }],
            config_paths: vec![".qoder/".into(), ".qodercli/".into()],
        },

        // =====================================
        // Pi Coding Agent
        // =====================================
        AiToolSecurityRule {
            id: "pi".into(),
            name: "Pi Coding Agent".into(),
            description: "Minimal extensible terminal coding agent".into(),
            docs_url: "https://badlogic-pi-mono.mintlify.app/installation".into(),
            process_names: vec!["pi".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "Provider Key in Pi Settings".into(),
                description: "Provider API keys stored in Pi's global settings".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*.json".into(),
                    pattern: "apiKey|api_key|accessToken|token|sk-".into(),
                },
                risk_level: RiskLevel::Medium,
                remediation: "Use environment variables or Pi's provider authentication flow".into(),
            }],
            config_paths: vec![".pi/agent/".into(), ".pi/sessions/".into()],
        },

        // =====================================
        // Amazon Q Developer CLI
        // =====================================
        AiToolSecurityRule {
            id: "amazonq".into(),
            name: "Amazon Q Developer CLI".into(),
            description: "AWS Amazon Q command-line coding assistant".into(),
            docs_url: "https://kiro.dev/docs/cli/migrating-from-q/".into(),
            process_names: vec!["q".into(), "amazon-q".into(), "amazonq".into()],
            ports: vec![],
            configs: vec![ConfigRule {
                name: "AWS Credentials in Amazon Q Config".into(),
                description: "AWS access keys or session tokens stored in Amazon Q config files".into(),
                check: ConfigCheckType::FileContains {
                    path_pattern: "**/*".into(),
                    pattern: "AKIA|ASIA|aws_access_key_id|aws_secret_access_key|aws_session_token".into(),
                },
                risk_level: RiskLevel::High,
                remediation: "Use AWS SSO, profiles, or the AWS credential chain instead of plaintext secrets in tool config files".into(),
            }],
            config_paths: vec![
                ".amazonq/".into(),
                ".aws/amazonq/".into(),
            ],
        },
    ]
}

/// Convenience reference for the rules
pub fn ai_tool_security_rules() -> &'static Vec<AiToolSecurityRule> {
    use std::sync::OnceLock;
    static RULES: OnceLock<Vec<AiToolSecurityRule>> = OnceLock::new();
    RULES.get_or_init(get_ai_tool_rules)
}

/// Get the actual rules
pub fn get_rules() -> &'static Vec<AiToolSecurityRule> {
    ai_tool_security_rules()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn security_rule_ids_match_ai_cli_ids() {
        let ids: std::collections::HashSet<_> = get_ai_tool_rules()
            .into_iter()
            .map(|rule| rule.id)
            .collect();
        for tool in crate::ai_tools::ai_tools() {
            assert!(
                ids.contains(tool.id),
                "missing security rule for {}",
                tool.id
            );
        }
    }
}
