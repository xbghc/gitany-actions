# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2024-01-15

### Added
- Initial release of Git utilities library
- `commit()` - Create git commits
- `push()` - Push changes to remote
- `fetch()` - Fetch from remote
- `newBranch()` - Create new branches
- `setRemote()` - Configure git remotes
- Git URL parsing utilities
- Cross-platform command execution using `cross-spawn`

### Features
- Minimal wrapper around git commands
- Cross-platform support (Windows, macOS, Linux)
- TypeScript type definitions
- Promise-based API
- ESM module support
- Support for Node.js 22+

[unreleased]: https://github.com/xbghc/gitany-actions/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/xbghc/gitany-actions/releases/tag/v0.0.1
