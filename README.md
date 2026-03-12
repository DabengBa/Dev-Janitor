# Dev Janitor v2 🧹

<div align="center">

<img src="assets/dev_janitor_banner_en.png" alt="Dev Janitor Banner" width="100%"/>

[![Build Status](https://github.com/cocojojo5213/dev-janitor/workflows/CI/badge.svg)](https://github.com/cocojojo5213/dev-janitor/actions)
[![Release](https://img.shields.io/github/v/release/cocojojo5213/dev-janitor)](https://github.com/cocojojo5213/dev-janitor/releases)
[![Downloads](https://img.shields.io/github/downloads/cocojojo5213/dev-janitor/total)](https://github.com/cocojojo5213/dev-janitor/releases)
[![License](https://img.shields.io/github/license/cocojojo5213/dev-janitor)](LICENSE)

**Keep Your Development Environment Sparkling Clean ✨**

[Download](#-installation) • [Features](#-features) • [Screenshots](#-screenshots) • [Development](#-development) • [Contributing](#-contributing) • [简体中文](README.zh-CN.md)

</div>

---

## 🚀 Why Dev Janitor?

Developers love creating, but we hate the mess left behind. `node_modules`, `target` folders, unused docker containers, orphans from AI tools... they eat up your disk space and slow you down.

**Dev Janitor** is your personal robot assistant that intelligently identifies and cleans development junk, recovers gigabytes of space, and keeps your machine running like new.

## ✨ Features

### 🧹 Intelligent Cleanup
- **Deep Scan**: Uses smart heuristics to find junk files hidden in your projects.
- **AI Leftovers**: Detects artifacts from AI coding tools (Aider, Cursor, Copilot, OpenCode).
- **Chat History**: Manage and clean AI chat histories and debug files per project.

### 🛠️ Tool Management
- **One-Stop Shop**: Manage installed tools for Node, Python, Rust, Go, and more.
- **Version Control**: Check versions and update global packages easily.
- **AI CLI Hub**: Install and manage AI tools like Claude Code, Codex, OpenCode, and Aider.

### 🔐 Security Scan (NEW in v2.2)
- **CVE Detection**: Scan for known vulnerabilities like CVE-2026-22812 (OpenCode RCE).
- **Port Exposure**: Detect AI tools with exposed ports that should be localhost-only.
- **API Key Leaks**: Find API keys stored insecurely in config files.
- **MCP Security**: Check Model Context Protocol servers for SSRF and credential leaks.
- **Supply Chain**: Detect malicious `.vscode/tasks.json` in Cursor projects.

### 📊 System Health
- **Process Killer**: Identify and stop resource-heavy development processes.
- **Port Scanner**: Find which service is hogging port 3000 or 8080.
- **Env Doctor**: Analyze your PATH and Shell config for errors and conflicts.

## 📸 Screenshots

<div align="center">
  <img src="assets/screenshots/tools.png" alt="Tools View" width="800"/>
  <p><em>Manage all your development tools in one place</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/ai_cleanup.png" alt="AI Cleanup View" width="800"/>
  <p><em>Scan and clean AI tool leftovers with a single click</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/cache.png" alt="Cache View" width="800"/>
  <p><em>Reclaim gigabytes of space from package manager caches</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/services.png" alt="Services View" width="800"/>
  <p><em>Monitor and manage development processes and ports</em></p>
</div>


## 📥 Installation

### Windows
Download the latest files from [Releases](https://github.com/cocojojo5213/dev-janitor/releases):
- **Installer**: `.msi`
- **Portable**: `*_portable.zip`

### MacOS
Download the `.dmg` from [Releases](https://github.com/cocojojo5213/dev-janitor/releases).
> *Note: Open via Right Click > Open to bypass Gatekeeper.*

### Linux
We support AppImage, .deb, and .rpm. Check the [Releases](https://github.com/cocojojo5213/dev-janitor/releases) page.

## 🛠️ Development

Built with ❤️ using **Tauri 2.0**, **React 19**, and **Rust**.

<details>
<summary>Click to see development setup instructions</summary>

### Prerequisites
- Node.js 24 LTS+
- pnpm 10.30.3+
- Rust 1.94.0

### Setup
```bash
# Clone repo
git clone https://github.com/cocojojo5213/Dev-Janitor.git
cd Dev-Janitor

# Enable pnpm via Corepack (recommended)
corepack enable pnpm

# Install
pnpm install

# Run dev
pnpm tauri dev

# Optional checks
pnpm lint
pnpm build
cargo test
```

</details>

## 🤝 Contributing

We welcome all contributions! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

## 📄 License

**MIT License** - See [LICENSE](LICENSE) for details.

## 📧 Contact

- Email: cocojojo5213@gmail.com

---

<div align="center">
  <sub>Built by <a href="https://github.com/cocojojo5213">cocojojo5213</a>
</div>
