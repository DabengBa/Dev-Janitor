# Dev Janitor

<div align="center">

<img src="assets/dev_janitor_banner_cn.png" alt="Dev Janitor Banner" width="100%"/>

[![Build Status](https://github.com/cocojojo5213/Dev-Janitor/workflows/CI/badge.svg)](https://github.com/cocojojo5213/Dev-Janitor/actions)
[![Release](https://img.shields.io/github/v/release/cocojojo5213/Dev-Janitor)](https://github.com/cocojojo5213/Dev-Janitor/releases)
[![Downloads](https://img.shields.io/github/downloads/cocojojo5213/Dev-Janitor/total)](https://github.com/cocojojo5213/Dev-Janitor/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)

一个跨平台桌面应用，用于清理开发残留、管理本地开发工具，并检查常见的环境问题。

[安装](#安装) • [功能](#功能) • [截图](#截图) • [开发](#开发) • [贡献](#参与贡献) • [English](README.md)

</div>

---

## 概览

Dev Janitor 用来处理开发过程中不断累积的本地残留文件和后台进程，例如包管理器缓存、构建输出、临时文件、AI 工具残留、端口占用，以及 Shell 配置漂移等问题。

## 功能

### 清理

- 扫描项目目录中的常见开发残留，例如 `node_modules`、`target`、日志、缓存和临时文件。
- 检测 AI 编程工具留下的临时残留，同时避免把 `.codex/config.toml`、`.claude/settings.json` 这类仍在使用的项目配置误判成垃圾文件。
- 按项目查看和清理 AI 聊天记录、缓存与调试文件。

### 工具管理

- 查看 Node、Python、Rust、Go 等生态中的常用工具。
- 检查版本并更新常见的全局包。
- 在一个界面中管理 Codex、Claude Code、Cursor、Gemini CLI、Aider、Continue、Kiro、iFlow、OpenCode、GitHub Copilot CLI、Qwen Code、Amp、Crush、Amazon Q Developer CLI 等 AI CLI 工具。

### 安全扫描

- 检查本地工具配置中的已知风险和易受攻击的设置。
- 标记通常应只监听 `localhost` 的端口。
- 检测常见配置文件中的 API 密钥泄露。
- 检查 MCP 服务器配置中可能导致凭证泄露或 SSRF 的模式。

### 系统工具

- 查看长期运行的开发进程。
- 查找某个端口当前被哪个进程占用。
- 排查 PATH 与 Shell 配置中的常见问题，包括 Windows 系统/用户持久化 PATH 条目。

## 截图

<div align="center">
  <img src="assets/screenshots/tools.png" alt="工具管理" width="800"/>
  <p><em>统一查看和管理开发工具</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/ai_cleanup.png" alt="AI 清理" width="800"/>
  <p><em>按项目查看并清理 AI 工具残留</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/cache.png" alt="缓存清理" width="800"/>
  <p><em>回收包管理器缓存占用的空间</em></p>
</div>

<br/>

<div align="center">
  <img src="assets/screenshots/services.png" alt="服务管理" width="800"/>
  <p><em>检查开发进程和端口占用</em></p>
</div>

## 安装

### Windows

从 [Releases](https://github.com/cocojojo5213/Dev-Janitor/releases) 页面下载：

- 安装版：`.msi`
- 便携版：`*_portable.zip`

### macOS

从 [Releases](https://github.com/cocojojo5213/Dev-Janitor/releases) 下载 `.dmg` 文件。
首次运行时，可能需要使用 `右键 > 打开` 通过 Gatekeeper。

### Linux

AppImage、`.deb` 和 `.rpm` 包会发布在 [Releases](https://github.com/cocojojo5213/Dev-Janitor/releases) 页面。

## 开发

本项目基于 Tauri 2、React 19 和 Rust。

<details>
<summary>开发环境配置</summary>

### 前置要求

- Node.js 24 LTS+
- pnpm 11.5.0+
- Rust 1.95.0

### 启动步骤

```bash
git clone https://github.com/cocojojo5213/Dev-Janitor.git
cd Dev-Janitor
corepack enable pnpm
pnpm install
pnpm tauri dev
```

### 检查命令

```bash
pnpm lint
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu
```

</details>

## 参与贡献

提交 Pull Request 之前，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

- 尽量让每个 Pull Request 聚焦在单一问题上。
- 功能或行为变化时，请同步更新文档。
- 安全问题请按 [SECURITY.md](SECURITY.md) 中的方式私下报告。
- 参与协作时请遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 项目文档

- [贡献指南](CONTRIBUTING.md)
- [发布与构建履历](docs/RELEASES.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [安全策略](SECURITY.md)
- [支持说明](SUPPORT.md)

## 许可证

本项目采用 [MIT License](LICENSE)。

## 联系方式

邮箱：cocojojo5213@gmail.com

---

<div align="center">
  <sub>Built by <a href="https://github.com/cocojojo5213">cocojojo5213</a></sub>
</div>
