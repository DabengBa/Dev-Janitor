# Release and Build History

This document records the repository release line, GitHub tag state, and Actions history that should be checked before publishing a new Dev Janitor release.

## Current Release State

- Latest published release: `v2.3.7`
- Published at: `2026-05-05T05:56:40Z`
- Release URL: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v2.3.7
- Published asset count: 22
- Current app version in this checkout: `2.4.0`
- Current toolchain baseline: Node.js 24, pnpm 11.5.0, Rust 1.95.0

The repository also has historical draft releases left by failed or repeated release runs. These drafts are not published artifacts. Before publishing a new release, review and delete stale drafts in GitHub Releases if they are no longer useful for debugging.

Known draft cleanup candidates observed on 2026-06-02:

| Tag | Draft count / note |
| --- | --- |
| `v2.3.7` | One stale draft from the first failed `v2.3.7` release attempt |
| `v2.3.2` | One stale draft |
| `v2.2.9` | One stale draft |
| `v2.2.8` | One stale draft-only release; no corresponding local tag in the current tag list |
| `v2.2.7` | Multiple stale drafts from repeated workflow attempts |
| `v2.2.5` | One stale draft |

## Version Tags

Recent v2 tags from the local repository after `git fetch --all --tags --prune`:

| Tag | Date | Commit | Subject |
| --- | --- | --- | --- |
| `v2.3.7` | 2026-05-05 | `e931153` | Dev Janitor v2.3.7 |
| `v2.3.6` | 2026-04-16 | `79f80d4` | v2.3.6 |
| `v2.3.5` | 2026-03-07 | `9074852` | release: v2.3.5 |
| `v2.3.4` | 2026-03-07 | `e2b583a` | v2.3.4 |
| `v2.3.3` | 2026-03-07 | `ddf7741` | v2.3.3 |
| `v2.3.2` | 2026-03-07 | `6e256ba` | v2.3.2 |
| `v2.3.1` | 2026-03-06 | `af02e5e` | Release v2.3.1 |
| `v2.2.9` | 2026-02-21 | `fd80850` | chore: bump version to 2.2.9 |
| `v2.2.7.2` | 2026-02-05 | `3f595f4` | fix: resolve USERPROFILE path for Claude uninstall on Windows |
| `v2.2.7.1` | 2026-02-05 | `cb506ce` | fix: remove nul pattern and add Windows reserved name check |
| `v2.2.7` | 2026-02-05 | `cb506ce` | fix: remove nul pattern and add Windows reserved name check |
| `v2.2.6` | 2026-01-31 | `d1b8ecd` | v2.2.6 |
| `v2.2.5` | 2026-01-31 | `faeeda6` | fix: clippy Path ref in config scan |
| `v2.2.4` | 2026-01-30 | `8f5ca5d` | chore: release v2.2.4 |
| `v2.2.3` | 2026-01-28 | `420f10d` | chore: bump version to 2.2.3 - Add command timeout protection |
| `v2.2.2` | 2026-01-27 | `df2639b` | v2.2.2: fix version sync & TypeScript types |
| `v2.2.1` | 2026-01-27 | `97a0c67` | v2.2.1 - AI Security Scan Module |
| `v2.2.0` | 2026-01-27 | `9311d0d` | v2.2.0 - AI Security Scan Module |
| `v2.1.1` | 2026-01-26 | `4012073` | fix: correct portable exe path detection in CI |
| `v2.1.0` | 2026-01-25 | `6a9fbe1` | Release v2.1.0: AI Chat History Management |
| `v2.0.5` | 2026-01-25 | `ec3f47f` | Release v2.0.5 |
| `v2.0.4` | 2026-01-25 | `b3456e0` | Release v2.0.4 |
| `v2.0.3` | 2026-01-25 | `2c02159` | chore: release v2.0.3 - fix AI CLI detection on Windows, add state persistence for all views |
| `v2.0.2` | 2026-01-25 | `1589b06` | fix: Clippy warning and AI cleanup state persistence (v2.0.2) |
| `v2.0.1` | 2026-01-24 | `1a8c607` | chore: bump version 2.0.1 |
| `v2.0.0` | 2026-01-24 | `b0b0eec` | fix: add lint script, workflow permissions and macos builds |

Useful commands:

```bash
git fetch --all --tags --prune
git tag --sort=-creatordate --format='%(refname:short)|%(creatordate:short)|%(objectname:short)|%(subject)'
gh release list --limit 50
```

## Recent GitHub Actions History

Recent workflow runs reviewed on 2026-06-02:

| Run | Created | Workflow | Result | Branch/tag | Commit | Title |
| --- | --- | --- | --- | --- | --- | --- |
| `25360531320` | 2026-05-05T06:02:37Z | CI | success | `main` | `3fa87c6` | fix Windows clippy lint |
| `25360073283` | 2026-05-05T05:47:24Z | Release | success | `v2.3.7` | `58b6171` | align Tauri JS packages for release |
| `25360068703` | 2026-05-05T05:47:14Z | CI | failure | `main` | `58b6171` | align Tauri JS packages for release |
| `25359905339` | 2026-05-05T05:41:35Z | Release | failure | `v2.3.7` | `5b00161` | fix Windows PATH diagnostics |
| `25359899455` | 2026-05-05T05:41:23Z | CI | failure | `main` | `5b00161` | fix Windows PATH diagnostics |
| `24513756435` | 2026-04-16T13:45:01Z | CI | success | `main` | `ab28117` | ci: upgrade node24 workflow actions |
| `24512891710` | 2026-04-16T13:27:18Z | Release | success | `v2.3.6` | `aab2f2b` | release: v2.3.6 |
| `24512890862` | 2026-04-16T13:27:17Z | CI | success | `main` | `aab2f2b` | release: v2.3.6 |
| `23003055459` | 2026-03-12T12:56:39Z | CI | success | `main` | `582c4f3` | docs: polish repository metadata and community files |
| `23002480742` | 2026-03-12T12:41:49Z | CI | success | `main` | `e88b2f5` | license: switch repository to MIT |
| `22793721992` | 2026-03-07T06:20:44Z | Release | success | `v2.3.5` | `9074852` | release: v2.3.5 |
| `22793721679` | 2026-03-07T06:20:42Z | CI | success | `main` | `9074852` | release: v2.3.5 |

Failure causes observed from `gh run view --log-failed`:

- `25359905339` failed because the release build had a Tauri Rust/JS minor mismatch: Rust `tauri` 2.10.3 versus `@tauri-apps/api` 2.11.0.
- `25359899455` failed for the same release-candidate commit, before the Tauri version alignment landed.
- `25360068703` failed on Windows Clippy because Rust 1.94 flagged a `needless_return` in `src-tauri/src/config/mod.rs`.
- `25360073283` then published `v2.3.7` successfully after Tauri package alignment.
- `25360531320` then made `main` green after the Windows Clippy fix.

Useful commands:

```bash
gh run list --limit 50 --json databaseId,displayTitle,workflowName,event,status,conclusion,headBranch,headSha,createdAt,updatedAt,url
gh run view <run-id> --log-failed
gh release view v2.3.7 --json tagName,name,isDraft,isPrerelease,publishedAt,createdAt,url,assets
```

## Release Checklist

Before tagging:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu
git diff --check
```

Version fields that must agree:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src/i18n/en.json`
- `src/i18n/zh.json`
- `CHANGELOG.md`

The release workflow runs on `v*` tag pushes. Manual runs must provide an existing tag through `release_tag`; this prevents accidentally building a release from `main` or another branch name.

After a successful release:

1. Confirm the release is published, not draft.
2. Confirm `latest.json` exists for the updater.
3. Confirm Windows `.msi`, `.exe`, portable ZIP, macOS `.dmg`, Linux AppImage, `.deb`, `.rpm`, and signatures are present.
4. Review stale draft releases and delete obsolete ones from GitHub Releases.
