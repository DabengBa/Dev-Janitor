# Contributing

Thanks for contributing to Dev Janitor.

## Before You Start

- Open an issue first for large changes.
- Keep pull requests focused. Avoid unrelated refactors in the same PR.
- Use `pnpm` as the JavaScript package manager for this repository.
- Review [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## Local Setup

```bash
git clone https://github.com/cocojojo5213/Dev-Janitor.git
cd Dev-Janitor
corepack enable pnpm
pnpm install
pnpm tauri dev
```

## Toolchain

- Node.js `24 LTS+`
- pnpm `11.5.0+`
- Rust `1.95.0`

## Validation

Run the relevant checks before opening a pull request:

```bash
pnpm lint
pnpm validate:release
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu
```

If you change cross-platform command execution or Tauri backend behavior, also verify Windows behavior when possible.

For release notes, tag history, and GitHub Actions history, see [docs/RELEASES.md](docs/RELEASES.md).

## Pull Requests

- Describe the problem and the root-cause fix.
- Include screenshots for UI changes.
- Mention any platform-specific tradeoffs, especially for Windows.
- Update `README.md` / `README.zh-CN.md` when setup, behavior, or supported platforms change.
- Use the pull request template and note which checks you ran.

## Security Reports

Do not open public issues for vulnerabilities. Report them as described in [SECURITY.md](SECURITY.md).
