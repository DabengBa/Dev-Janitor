# Changelog / 更新日志

All notable changes to Dev Janitor will be documented in this file.  
本文件记录 Dev Janitor 的所有重要变更。

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) | [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.2.6] - 2026-01-31

### Fixes & Updates
- Fix per-tool security scan invoke args (use toolId) to resolve "missing required key toolId" errors.

---

## [2.2.5] - 2026-01-30

### Fixes & Updates | 修复与更新

- Align AI CLI install/update/uninstall with latest tooling (Claude Code native installer, OpenCode upgrade/uninstall), and refresh docs.  
  对齐 AI CLI 最新安装/更新/卸载方式（Claude Code 原生安装器、OpenCode 升级/卸载），并更新文档链接。
- Prefer `python -m pip`/`py -m pip` for pip management to avoid wrong interpreter; run conda/composer via `cmd /C` on Windows.  
  pip 优先走 `python -m pip`/`py -m pip` 避免解释器错配；Windows 下 conda/composer 通过 `cmd /C` 调用。
- Cargo global list parsing now accepts pre-release versions.  
  Cargo 全局列表解析支持预发布版本。
- Security scan config checks now honor path patterns and avoid duplicate “missing” spam.  
  安全扫描配置检查遵循路径模式，避免重复“缺失”提示。
- Unix port scan fallback (lsof) parsing fixed.  
  修复 Unix 端口扫描降级到 lsof 时的解析错误。
- Tools uninstall delegates AI CLI tools to the dedicated module; Windows command execution normalized.  
  工具卸载中 AI CLI 改由专用模块处理；Windows 命令执行统一规范化。
- UI robustness: fallback view, missing badge styles, reason translation fix, ASCII icons for Windows terminals.  
  界面稳健性提升：默认回退视图、补齐徽标样式、修复原因翻译、Windows 终端改用 ASCII 图标。
- Clippy cleanup: use `&Path` instead of `&PathBuf` in security scan helper.  
  Clippy 清理：安全扫描辅助函数改用 `&Path`。

---

## [2.2.4] - 2026-01-30

### 🛠 Fixes & Updates | 修复与更新

- Fix Tauri invoke parameter mismatch (camelCase → snake_case), restoring tool/package/cache/AI CLI/scan actions.  
  修复 Tauri 调用参数命名不一致问题，恢复工具/包/缓存/AI CLI/扫描功能。
- Chat History scan now clears previous selections to prevent accidental deletes.  
  聊天记录扫描会清空旧选择，避免误删。
- Services: refresh ports list after killing a process from the Ports tab.  
  服务页：在端口页杀进程后刷新端口列表。
- Windows UDP ports now parsed correctly (netstat output), improving port list accuracy.  
  Windows UDP 端口解析修复，端口列表更准确。
- Process memory display corrected (sysinfo KiB → bytes).  
  修正进程内存显示（sysinfo KiB → 字节）。
- Security scan now evaluates actual local bindings using parsed local addresses, reducing false positives.  
  安全扫描改用真实本地绑定地址判断，降低误报。

### 🔧 AI CLI Commands Refresh | AI CLI 命令更新

- Updated latest install/update commands and docs for Codex, Claude Code, Gemini CLI, Continue, OpenCode, Cursor.  
  更新 Codex、Claude Code、Gemini CLI、Continue、OpenCode、Cursor 的最新安装/更新命令与文档链接。
- OpenCode uninstall now targets the new npm package name (`opencode-ai`).  
  OpenCode 卸载改为新 npm 包名（`opencode-ai`）。
- iFlow uninstall updated to new npm package name (`@iflow-ai/iflow-cli`).  
  iFlow 卸载更新为新 npm 包名（`@iflow-ai/iflow-cli`）。

---

## [2.2.3] - 2026-01-28

### 🛡️ Command Timeout Protection | 命令超时保护

- Add timeout protection for external CLI commands to prevent UI freeze when a tool hangs.  
  为外部 CLI 命令添加超时保护，避免某个工具卡住导致界面冻结。

**Timeout Strategy | 超时策略:**

| Scenario | Timeout | 场景 |
|----------|---------|------|
| Version detection | 6s | 版本探测 |
| Package list | 30s | 包列表 |
| Port scan | 5s | 端口扫描 |

- If a command times out, it will be skipped and the scan continues.  
  如果命令超时，该项会被跳过，扫描继续完成。

**Files Changed | 变更文件:**
- `command.rs` - New timeout command executor
- `detection/mod.rs` - Tool scan with timeout
- `ai_cli/mod.rs` - AI CLI version detection with timeout
- `npm.rs`, `pip.rs`, `cargo.rs`, `composer.rs`, `conda.rs` - Package manager scan with timeout
- `services/mod.rs` - Port scan with timeout

---

## [2.2.2] - 2026-01-27

### 🛠 Fixes | 修复

- Windows portable asset: Generate the portable ZIP in the Windows release directory and upload it via the GitHub API using `release_id`, so it reliably appears in GitHub Releases.  
  Windows 便携版产物：在 Windows 发布目录中生成便携 ZIP，并通过 `release_id` 使用 GitHub API 上传，确保在 Releases 中稳定出现。
- Windows 10 full-disk scan freeze: Clamp root scans to a safer max depth and redirect root-path scans to the current user's home directory to avoid drive-wide hangs.  
  Windows 10 全盘扫描卡死：限制根路径扫描的最大深度，并将根路径扫描重定向到当前用户主目录，避免整盘扫描导致卡死。

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
