# Changelog

## [Unreleased]

### Added
- Complete NIP-19 support: nevent (full TLV with author/kind), naddr (event coordinates), nrelay (deprecated)

### Fixed
- Bech32 kind encoding (type 3) now uses big-endian byte order per spec

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
