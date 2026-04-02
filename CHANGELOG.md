# Changelog

## [0.0.9] - 2026-04-02

### Added
- Test coverage for crypto, events, relay messages, database, and relay client integration
- Configurable event loading with last-visit tracking and text truncation
- Settings UI for event flow behavior

### Changed
- Upgraded @noble/curves (v2), @noble/hashes (v2), idb (v8), nanoid (v5), ws, esbuild, typescript
- Jest switched to ESM mode for native ES module support
- Common package exports switched to ESM-only (required by noble v2)

### Fixed
- Worker pagination direction bug (OLDER direction was going forward)
- Blocked users' events properly removed from IndexedDB and UI
