# Changelog

All notable changes to Dev Janitor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-01-18

### Added

#### Theme Mode Support
- **Light/Dark/System themes**: Full theme mode support with Ant Design token system
- **Theme Selector**: New settings component for easy theme switching
- **System Follow**: Automatically matches OS theme preference
- **Persistent Theme**: Theme preference saved across sessions

#### Bug Fixes
- **Package Version Cache**: Fixed version check state being lost when switching tabs or updating packages
  - Moved version cache from component state to global store
  - Version check results now persist across page navigation
- **CSP Fix**: Added `'unsafe-inline'` to script-src for Vite HMR compatibility in development

### Changed
- Migrated all hardcoded colors to Ant Design theme tokens for consistent theming
- Improved text alignment consistency across Settings components
- Updated OpenAI connect-src to support more API endpoints

---

## [1.4.0] - 2026-01-17

### Added

#### Security Enhancements
- **Command Validator**: Whitelist-based command validation to prevent command injection
- **Input Validator**: Package name, PID, and path traversal validation
- **CSP Manager**: Content Security Policy with nonce-based script protection
- **IPC Sender Verification**: Validates IPC message origins

#### Memory Leak Fixes
- **LRU Cache Manager**: Bounded cache (max 1000 entries) with automatic expiration
- **AbortController Integration**: Proper cleanup for async operations in AIAssistantDrawer
- **ServiceMonitor Cache**: Automatic cache cleanup with configurable TTL

#### Performance Optimizations
- **PackageTable Memoization**: useMemo for version comparisons, useCallback for handlers
- **Debounced Service Monitoring**: 500ms debounce with background throttling (30s)
- **Version Check Progress**: Progress indicator with cancel functionality

#### UI/UX Improvements
- **Markdown Error Boundary**: Graceful error handling for AI response rendering
- **Responsive AIConfigSection**: Better layout on small screens
- **Unified Error Responses**: Consistent IPC error format with error codes

#### Electron Fixes
- **macOS IPC Cleanup**: Proper handler cleanup on window close
- **Preload Error Handling**: Try-catch with fallback for contextBridge
- **IPC Timeout Protection**: 30-second default timeout with retry support

#### Code Quality
- **Store Null Safety**: Validates package arrays from IPC calls
- **Unified IPC Response Types**: Standardized success/error response format
- **402 Tests Passing**: Comprehensive test coverage

### Changed
- Improved error feedback in App.tsx with retry options
- Enhanced preload script with detailed error logging
- ServiceMonitor now uses bounded LRU cache instead of unbounded Map

### Security
- All shell commands now validated against whitelist
- Package names validated against npm/pip naming rules
- PID values validated as positive integers
- Path traversal attacks prevented in file operations
- CSP prevents inline script execution

---

## [1.2.0] - 2026-01-17

### Added

#### One-Click Package Update (NEW!)
- Direct package update button in the package table
- Support for npm global packages update (`npm update -g`)
- Support for pip packages update (`pip install --upgrade`)
- Real-time update progress indication
- Automatic package list refresh after update
- Version status display with latest version number

#### Internationalization
- Added Chinese translations for package update feature
- Added English translations for package update feature

### Changed
- Improved package version status column UI
- Version tag now shows target version number directly

---

## [1.1.0] - 2026-01-17

### Added

#### Custom AI Provider Support
- Support for custom OpenAI-compatible API endpoints
- Configurable base URL for self-hosted or third-party AI services
- Model selection dropdown with manual input option
- Fetch available models from custom endpoints
- Connection test functionality

### Changed
- Improved AI configuration UI with better tooltips
- Enhanced error handling for AI API calls

---

## [1.0.0] - 2024-01-XX

### Added

#### AI Assistant (NEW!)
- Local rule-based intelligent analysis (no API key required)
- Automatic detection of outdated tool versions
- PATH duplicate and conflict detection
- Port conflict identification
- Missing essential tools recommendations
- Optimization suggestions with executable commands
- Optional OpenAI integration for deeper insights
- Environment health assessment
- Personalized recommendations
- Multi-language support (English/Chinese)

#### Enhanced Tool Detection
- Added support for Java, Go, Rust, Ruby, .NET detection
- Added support for Yarn, pnpm, Cargo, RubyGems package managers
- Added support for Git, Docker, Kubernetes CLI, Terraform
- Improved Windows Python detection (py command support)
- Improved Windows pip detection (py -m pip support)
- Total 19+ tools now supported

#### Tool Detection
- Automatic detection of installed development tools on system startup
- Support for detecting Node.js, npm, Python, pip, PHP, and Composer
- Version number and installation path retrieval for each tool
- Clear visual indicators for installed vs unavailable tools
- PATH scanning for additional executable tools
- Multiple installation location detection

#### Package Management
- NPM global packages listing and management
- Python pip packages listing and management
- Composer global packages listing and management
- Package uninstallation functionality
- Package search and filtering

#### Service Monitoring
- Detection of running development processes
- Port-based service identification
- Process name, PID, and port display
- One-click service termination
- Auto-refresh every 5 seconds

#### Environment Variables
- Complete system environment variable scanning
- PATH entry analysis with duplicate detection
- Category-based filtering (PATH, Java, Python, Node, etc.)
- Search functionality for variables
- Problematic configuration highlighting

#### User Interface
- Clean and intuitive Ant Design-based layout
- Responsive design for different window sizes
- Tool cards with status indicators
- Tabbed package manager interface
- Service monitoring table with actions
- Environment variable explorer with PATH analyzer

#### Internationalization
- English (en-US) language support
- Chinese Simplified (zh-CN) language support
- Language switcher in settings
- Automatic system language detection
- Persistent language preference

#### Cross-Platform Support
- Windows 10/11 support
- macOS 10.15+ support
- Linux support (AppImage, deb)
- Platform-specific command execution
- Proper path format handling per platform

#### Settings & Configuration
- Language selection
- About section with version info
- Application preferences persistence

#### Error Handling
- Graceful error handling for command failures
- User-friendly error messages
- Error boundary for React components
- Toast notifications for user feedback
- Continued operation on partial failures

#### Build & Distribution
- Electron-builder configuration for all platforms
- Windows installer (exe)
- macOS disk image (dmg)
- Linux AppImage and deb packages
- Application icons and metadata
- Auto-update support via electron-updater

### Technical Details

- Built with Electron 30 + React 18 + TypeScript
- Ant Design 5 for UI components
- Zustand for state management
- i18next for internationalization
- Tailwind CSS for styling
- Vitest + fast-check for testing
- Vite for development and building

---

## Future Releases

### Planned Features
- [x] Package update notifications
- [x] Tool update functionality (npm/pip)
- [x] Dark mode support
- [ ] Custom tool detection rules
- [ ] Export/import configuration
- [ ] System tray integration
- [ ] Keyboard shortcuts
- [ ] Plugin system for additional tools
- [ ] Composer package update support

### Known Issues
- None reported yet

---

[1.5.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.5.0
[1.4.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.4.0
[1.3.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.3.0
[1.2.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.2.0
[1.1.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.1.0
[1.0.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.0.0
