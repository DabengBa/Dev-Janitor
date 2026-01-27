# Changelog / 更新日志

All notable changes to Dev Janitor will be documented in this file.  
本文件记录 Dev Janitor 的所有重要变更。

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) | [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.2.1] - 2026-01-27

### 🔐 AI Security Scan | AI 安全扫描

New security scanning module for AI development tools.  
新增 AI 开发工具安全扫描模块。

**Supported Tools | 支持的工具 (10):**

| Tool | Key Checks | 检测项 |
|------|------------|--------|
| **OpenCode** | ⚠️ CVE-2026-22812 (ports 4096-4097, RCE via CORS) | 远程代码执行漏洞 |
| **Cursor** | Debug port (9229), supply chain attack (.vscode/tasks.json) | 调试端口、供应链攻击 |
| **MCP Servers** | SSRF (36.7%), credential leakage (66%) | SSRF 漏洞、凭证泄露 |
| **Clawdbot** | Gateway (18789), Control UI (18790), API keys | 网关端口、API 密钥 |
| **Claude Code** | Chrome DevTools port (9222) | 调试端口 |
| **Aider** | WebUI port, API keys in config | WebUI 端口、配置中的密钥 |
| **Codex CLI** | API keys in config | 配置中的 API 密钥 |
| **Continue** | Local server port | 本地服务器端口 |
| **Windsurf** | Language server port | 语言服务器端口 |
| **Gemini CLI** | Google API keys (AIza pattern) | Google API 密钥 |

**Risk Levels | 风险等级:** Critical (严重) → High (高危) → Medium (中危) → Low (低危)

---

## [2.1.1] - 2026-01-26

### 📦 Windows Portable | Windows 便携版

- Windows x64 portable ZIP (no installer needed)  
  Windows x64 便携版 ZIP（无需安装）
- Requires WebView2 Runtime (pre-installed on Win 10/11)  
  需要 WebView2 Runtime（Win 10/11 通常已预装）

---

## [2.1.0] - 2026-01-25

### 💬 Chat History Management | 聊天记录管理

- Manage AI assistant chat logs per project  
  按项目管理 AI 助手的对话记录
- Supports: Claude Code, Codex, Gemini CLI, Aider, Cursor, Continue, Cody  
  支持：Claude Code、Codex、Gemini CLI、Aider、Cursor、Continue、Cody
- Scan global AI config directories (~/.claude, ~/.codex, etc.)  
  扫描全局 AI 配置目录
- Batch or individual deletion  
  批量或单个删除

---

## [2.0.x] - 2026-01-24/25

### 🔧 Bug Fixes & Improvements | 修复与优化

**2.0.5** - Fix Clippy `unused_mut` on Linux/macOS  
**2.0.4** - Dynamic config file scanning (no hardcoded paths)  
**2.0.3** - Persist scan results across view switches; Windows npm CLI detection fix  
**2.0.2** - Fix Clippy warnings; migrate AI cleanup state to global store  
**2.0.1** - Fix cache selection across tabs; AI cleanup whitelist recursion; i18n improvements

---

## [2.0.0] - 2026-01-24

### 🎉 Complete Rebuild | 全面重构

**Tech Stack | 技术栈:**
- Tauri 2.0 + React 18 + TypeScript + Rust
- Bundle size < 25MB (vs ~150MB Electron)
- Multi-language: EN / 中文 / 日本語

**Features | 功能:**

| Module | Description | 描述 |
|--------|-------------|------|
| **Tools** | Detect 30+ dev tools with version info | 检测 30+ 开发工具 |
| **Packages** | Manage global packages (npm/pnpm/yarn/pip/cargo) | 管理全局包 |
| **Cache** | Clean dev caches and node_modules | 清理缓存和 node_modules |
| **AI Cleanup** | Remove AI tool artifacts (15+ patterns) | 清理 AI 工具残留 |
| **Services** | Monitor dev processes and ports | 监控进程和端口 |
| **Config** | Analyze PATH and shell configs | 分析 PATH 和配置 |
| **AI CLI** | Manage AI coding assistants | 管理 AI 编程助手 |

**Platforms | 平台:**
- Windows: .msi, .exe, portable .zip
- Linux: .AppImage, .deb, .rpm
- macOS: .dmg (unsigned)

---

## [1.x.x] - Legacy

Previous Electron-based versions. See [old repository](https://github.com/cocojojo5213/dev-janitor-legacy) for history.  
旧版 Electron 实现，详见旧仓库。
