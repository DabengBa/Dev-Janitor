# Changelog / 更新日志

All notable changes to Dev Janitor will be documented in this file.  
本文件记录 Dev Janitor 的所有重要变更。

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) | [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.4.1] - 2026-06-02

### Release Patch | 发布补丁

- Remove the unused custom AI endpoint setting and stale persisted store fields so Settings only exposes working preferences.
  移除未实际接入的自定义 AI 端点设置和旧的持久化 store 字段，让设置页只保留可用偏好项。
- Route Chat History through the shared typed IPC helpers instead of direct `invoke` calls, keeping command error handling consistent with other views.
  将聊天记录页面切换到统一 typed IPC 封装，不再直接调用 `invoke`，让命令错误处理与其它页面保持一致。
- Add Cline CLI support across AI CLI detection, lifecycle commands, service monitoring, chat-history cleanup, AI junk cleanup, and security scanning.
  新增 Cline CLI 支持，覆盖 AI CLI 检测、生命周期命令、服务监控、聊天记录清理、AI 垃圾清理和安全扫描。
- Update Amp lifecycle commands to the current direct installer and `@ampcode/cli` npm package, replacing the old `@sourcegraph/amp` package name.
  将 Amp 生命周期命令更新为当前直装脚本和 `@ampcode/cli` npm 包名，替换旧的 `@sourcegraph/amp` 包名。
- Set the app, bundle, crate, and localized display versions to `v2.4.1` for this patch release.
  将应用、安装包、Rust crate 和本地化显示版本同步为本次补丁发布的 `v2.4.1`。

---

## [2.4.0] - 2026-06-02

### AI CLI Refresh | AI CLI 刷新

- Refresh the AI CLI matrix with current package names and lifecycle commands for Codex, Claude Code, Sourcegraph Cody, GitHub Copilot CLI, Qwen Code, Amp, Crush, and Amazon Q Developer CLI.
  刷新 AI CLI 矩阵，更新 Codex、Claude Code、Sourcegraph Cody、GitHub Copilot CLI、Qwen Code、Amp、Crush、Amazon Q Developer CLI 的包名与生命周期命令。
- Extend tool detection, service categorization, config discovery, chat-history cleanup, and AI junk cleanup to cover the new CLI tools while keeping active project config directories out of deletable junk results.
  扩展工具检测、服务分类、配置发现、聊天记录清理和 AI 垃圾清理，覆盖新增 CLI 工具，同时继续避免把仍在使用的项目配置目录当成可删除垃圾。
- Align AI security scan rule IDs with the AI CLI IDs and add conservative checks for plaintext provider keys, GitHub tokens, AWS credentials, and exposed local helper ports.
  将 AI 安全扫描规则 ID 与 AI CLI ID 对齐，并新增针对明文提供商密钥、GitHub token、AWS 凭证和本地辅助端口暴露的保守检查。
- Add pnpm and Yarn global package manager support, restore bounded npm outdated checks, and update the project toolchain/dependencies to pnpm 11.5, Rust 1.95, Tauri 2.11, Vite 8, TypeScript 6, React 19.2, and i18next 26.
  新增 pnpm 与 Yarn 全局包管理支持，恢复有超时保护的 npm outdated 检查，并将项目工具链和依赖更新到 pnpm 11.5、Rust 1.95、Tauri 2.11、Vite 8、TypeScript 6、React 19.2 和 i18next 26。
- Set the app, bundle, crate, and localized display versions to `v2.4.0` for this release.
  将应用、安装包、Rust crate 和本地化显示版本同步为本次发布的 `v2.4.0`。

---

## [2.3.7] - 2026-05-05

### Windows PATH Diagnostics | Windows PATH 诊断

- Read persisted Windows Machine/User `Path` values from the registry when diagnosing PATH entries, so deleted entries no longer reappear from the app process's stale startup environment.
  Windows 诊断 PATH 时改为读取注册表中的系统/用户持久化 `Path`，避免已删除的条目继续从应用启动时继承的旧环境变量中显示。
- Normalize PATH entries before checking existence: trim whitespace, handle quoted paths, and expand Windows `%VAR%` variables.
  判断路径是否存在前先规范化 PATH 条目：去除空白、支持带引号路径，并展开 Windows `%VAR%` 环境变量。
- Refresh same-major frontend dependencies for the patch release: Tauri plugin JS packages, React/React DOM, and Zustand.
  同步升级本补丁版本中的同主版本前端依赖：Tauri 插件 JS 包、React/React DOM 和 Zustand。
- Validate with `pnpm lint`, `pnpm build`, `cargo fmt --check`, `cargo test`, `cargo clippy`, and `cargo check --target x86_64-pc-windows-gnu`.
  使用 `pnpm lint`、`pnpm build`、`cargo fmt --check`、`cargo test`、`cargo clippy` 和 `cargo check --target x86_64-pc-windows-gnu` 完成验证。

---

## [2.3.3] - 2026-03-07

### Release Fix | 发布修复

- Align `@tauri-apps/plugin-updater` with the Rust updater crate on `2.9.x` so Tauri's release build passes package version checks on macOS CI.  
  将 `@tauri-apps/plugin-updater` 与 Rust 侧 updater crate 对齐到 `2.9.x`，修复 macOS CI 中 Tauri 版本检查导致的发布失败。

---

## [2.3.2] - 2026-03-07

### Updater Fix | 自动更新修复

- Enable Tauri updater artifacts and release signing metadata so GitHub releases publish `latest.json` for in-app updates.  
  启用 Tauri updater 产物和 release 签名元数据，让 GitHub release 正常发布 `latest.json`，供应用内更新使用。
- Register the updater and process plugins in the desktop app and check for updates on startup.  
  在桌面端接入 updater 和 process 插件，并在应用启动时检查更新。
- Disable release symbol stripping that breaks Tauri bundle type detection required by the updater.  
  关闭会破坏 Tauri bundle 类型检测的 release 符号裁剪，避免 updater 无法识别安装包类型。
- Validate the fix with `pnpm lint`, `pnpm build`, `cargo check`, `cargo test`, and `cargo fmt --check`.  
  使用 `pnpm lint`、`pnpm build`、`cargo check`、`cargo test`、`cargo fmt --check` 验证修复。

---

## [2.3.1] - 2026-03-06

### Fixes & Validation | 修复与验证

- Stop treating `.kiro` project metadata as deletable chat history or AI junk, preventing accidental deletion of Kiro project rules and agents.  
  不再将 `.kiro` 项目元数据识别为可删除的聊天记录或 AI 垃圾，避免误删 Kiro 项目规则与 agents。
- Restore Cursor CLI update/detection to `cursor-agent`, and make Kiro CLI manual-action handling platform-safe.  
  将 Cursor CLI 的更新与探测恢复为 `cursor-agent`，并让 Kiro CLI 的手动安装/更新/卸载逻辑在不同平台上更安全。
- Reset the view error boundary when switching pages so one crashed screen does not block the whole main content area.  
  切换页面时重置视图错误边界，避免单个页面崩溃后阻塞整个主内容区。
- Validate the release candidate with `pnpm lint`, `pnpm build`, `cargo check`, `cargo test`, and `cargo clippy`.  
  使用 `pnpm lint`、`pnpm build`、`cargo check`、`cargo test`、`cargo clippy` 完成发布前验证。

---

## [2.2.9] - 2026-02-05

### Build Fix | 构建修复

- Fix Tauri plugin version: plugins use separate versioning (^2.5.x), not same as core (^2.9.x).  
  修复 Tauri 插件版本：插件使用独立版本号（^2.5.x），与核心（^2.9.x）不同。

---

## [2.2.8] - 2026-02-05

### Build Fix | 构建修复

- Pin Tauri packages to ~2.9.x to fix version mismatch build error (`tauri 2.9.5` vs `@tauri-apps/api 2.10.1`).  
  锁定 Tauri 相关包版本到 ~2.9.x，修复版本不匹配导致的构建错误。

---

## [2.2.7] - 2026-02-05

### Fixes | 修复

- Fix Tauri 2.0 invoke parameter naming (snake_case → camelCase) for all commands with multi-word params.  
  修复所有多词参数的 Tauri 2.0 调用参数命名（snake_case → camelCase）。
  - `scan_ai_junk_cmd`, `scan_chat_history_cmd`, `scan_project_caches_cmd`: `max_depth` → `maxDepth`
  - `get_tool_info`, `uninstall_tool`, `install_ai_tool_cmd`, `update_ai_tool_cmd`, `uninstall_ai_tool_cmd`, `scan_tool_security_cmd`: `tool_id` → `toolId`

- Fix process memory display showing 1000x actual value (3 MB displayed as 3138 GB).  
  修复进程内存显示为实际值的 1000 倍（3 MB 显示为 3138 GB）。
  - Removed erroneous `saturating_mul(1024)` - `sysinfo::Process::memory()` already returns bytes.  
    移除错误的 `saturating_mul(1024)` - `sysinfo::Process::memory()` 已返回字节。

- Update Sourcegraph Cody CLI package name: `@sourcegraph/cody` → `@sourcegraph/cody-agent`.  
  更新 Sourcegraph Cody CLI 包名：`@sourcegraph/cody` → `@sourcegraph/cody-agent`。

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
