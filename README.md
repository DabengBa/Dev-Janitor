# Dev Janitor

<div align="center">

<img src="assets/dev_janitor_banner_en.png" alt="Dev Janitor Banner" width="100%"/>

[![Build Status](https://github.com/cocojojo5213/Dev-Janitor/workflows/CI/badge.svg)](https://github.com/cocojojo5213/Dev-Janitor/actions)
[![Release](https://img.shields.io/github/v/release/cocojojo5213/Dev-Janitor)](https://github.com/cocojojo5213/Dev-Janitor/releases)
[![Downloads](https://img.shields.io/github/downloads/cocojojo5213/Dev-Janitor/total)](https://github.com/cocojojo5213/Dev-Janitor/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)

Cross-platform desktop application for cleaning development artifacts, managing local developer tools, and checking common environment issues.

[Download](#installation) • [Features](#features) • [Screenshots](#screenshots) • [Development](#development) • [Contributing](#contributing) • [简体中文](README.zh-CN.md)

</div>

---

## Overview

Dev Janitor helps keep a local development machine under control. It focuses on the files, caches, services, and configuration drift that accumulate during everyday work.

## Features

### Cleanup

- Scan project directories for common development artifacts such as `node_modules`, `target`, logs, caches, and temporary files.
- Detect ephemeral leftovers from AI coding tools without flagging active project config files such as `.codex/config.toml` or `.claude/settings.json` as junk.
- Review and remove AI chat history, cache, and debug files on a per-project basis.

### Tool Management

- Inspect installed tools across Node, Python, Rust, Go, and related ecosystems.
- Check versions and update common global packages.
- Manage current AI CLI tools such as Codex, Claude Code, Cursor, Gemini CLI, Aider, Continue, Kiro, iFlow, OpenCode, GitHub Copilot CLI, Qwen Code, Cline, Amp, Crush, and Amazon Q Developer CLI from one interface.

### Security Scan

- Check for risky local tool configurations and known vulnerable setups.
- Flag ports that should usually listen on `localhost` only.
- Detect API keys stored in common configuration files.
- Inspect MCP server configurations for patterns that can lead to credential exposure or SSRF.

### System Utilities

- Inspect long-running development processes.
- Find which process is using a specific port.
- Review PATH and shell configuration issues, including persisted Windows system/user PATH entries.

## Screenshots

<div align="center">
  <img src="assets/screenshots/tools.png" alt="Tools View" width="800"/>
  <p><em>Manage development tools in one place</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/ai_cleanup.png" alt="AI Cleanup View" width="800"/>
  <p><em>Review and clean AI tool leftovers per project</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/cache.png" alt="Cache View" width="800"/>
  <p><em>Reclaim space from package manager caches</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/services.png" alt="Services View" width="800"/>
  <p><em>Inspect development processes and port usage</em></p>
</div>

## Installation

### Windows

Download the latest files from [Releases](https://github.com/cocojojo5213/Dev-Janitor/releases):

- Installer: `.msi`
- Portable: `*_portable.zip`

### macOS

Download the `.dmg` from [Releases](https://github.com/cocojojo5213/Dev-Janitor/releases).
The first launch may require `Right Click > Open` because of Gatekeeper.

### Linux

AppImage, `.deb`, and `.rpm` packages are published on the [Releases](https://github.com/cocojojo5213/Dev-Janitor/releases) page.

## Development

Dev Janitor is built with Tauri 2, React 19, and Rust.

<details>
<summary>Development setup</summary>

### Prerequisites

- Node.js 24 LTS+
- pnpm 11.5.0+
- Rust 1.95.0

### Setup

```bash
git clone https://github.com/cocojojo5213/Dev-Janitor.git
cd Dev-Janitor
corepack enable pnpm
pnpm install
pnpm tauri dev
```

### Validation

```bash
pnpm lint
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu
```

</details>

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

- Keep pull requests focused.
- Update documentation when behavior or setup changes.
- Report security issues privately as described in [SECURITY.md](SECURITY.md).
- Follow the expectations in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Project Docs

- [Contributing Guide](CONTRIBUTING.md)
- [Release and Build History](docs/RELEASES.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Support](SUPPORT.md)

## License

This project is available under the [MIT License](LICENSE).

## Contact

Email: cocojojo5213@gmail.com

---

<div align="center">
  <sub>Built by <a href="https://github.com/cocojojo5213">cocojojo5213</a></sub>
</div>
