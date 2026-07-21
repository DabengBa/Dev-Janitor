## Summary

- explain the problem
- explain the fix

## Testing

- [ ] `pnpm lint`
- [ ] `pnpm validate:release`
- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `cargo fmt --check --manifest-path src-tauri/Cargo.toml`
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
- [ ] `cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu`

## Notes

- platform-specific considerations:
- screenshots or recordings for UI changes:
- related issue:
