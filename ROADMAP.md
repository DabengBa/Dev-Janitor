# Dev Janitor Roadmap

项目路线图，记录计划中的功能和改进。

## 🚀 v1.7.0 - AI CLI 配置管理

### AI CLI 工具配置 (Phase 2)
- [ ] 读取/编辑各工具的配置文件
  - Codex: `~/.codex/config.json`
  - Claude Code: `~/.claude/settings.json`
  - Gemini CLI: `~/.gemini/settings.json`
  - OpenCode: `~/.opencode/config.json`
- [ ] API Key 配置界面
- [ ] 默认模型选择
- [ ] MCP 服务器配置
  - 添加/删除 MCP 服务器
  - 配置服务器参数
  - 启用/禁用服务器
- [ ] 助手行为配置（如有）

### 技术细节
- 配置文件路径：
  - Windows: `%USERPROFILE%\.{tool}/`
  - macOS/Linux: `~/.{tool}/`
- 需要新增 IPC handlers: `ai-cli:read-config`, `ai-cli:write-config`
- UI: 在 AICLIView 中添加配置 Tab 或 Modal

---

## 🧹 v1.8.0 - 缓存清理功能

### 包管理器缓存清理
- [ ] 扫描各包管理器缓存目录大小
  - npm: `~/.npm/_cacache`
  - yarn: `~/.yarn/cache`
  - pnpm: `~/.pnpm-store`
  - pip: `~/.cache/pip` (Linux/Mac) / `%LOCALAPPDATA%\pip\cache` (Windows)
  - Composer: `~/.composer/cache`
  - Cargo: `~/.cargo/registry/cache`
  - Homebrew: `~/Library/Caches/Homebrew`
- [ ] 显示各缓存占用空间
- [ ] 一键清理单个/全部缓存
- [ ] 清理前确认提示
- [ ] 清理结果统计（释放了多少空间）

---

## 📋 Backlog (未排期)

### 功能增强
- [ ] 自定义工具检测规则
- [ ] 导出/导入配置
- [ ] 系统托盘集成
- [ ] 键盘快捷键
- [ ] 插件系统
- [ ] Composer 包更新支持

### 代码质量
- [ ] 提高测试覆盖率
- [ ] 性能优化
- [ ] 文档完善

---

## ✅ 已完成

### v1.6.2 - AI CLI 基础功能
- [x] AI CLI 工具检测 (Codex, Claude, Gemini, OpenCode)
- [x] 一键安装/更新/卸载
- [x] 版本和状态显示
- [x] 快速访问主页和配置文件夹
- [x] i18n 支持

### v1.6.1
- [x] Maven 工具检测
- [x] Java 版本检测修复
- [x] 隐藏菜单栏
- [x] 动态版本号
- [x] AI 配置 i18n

---

*最后更新: 2026-01-20*
