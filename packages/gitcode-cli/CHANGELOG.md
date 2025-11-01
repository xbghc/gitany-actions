# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2024-01-15

### Added
- Initial release of GitCode CLI
- Authentication commands (`auth set-token`, `auth status`, `auth remove-token`)
- User commands (`user show`, `user namespace`)
- Repository commands (`repo permission`, `repo info`)
- Pull Request commands (`pr list`, `pr create`, `pr info`)
- Issue commands (`issue list`, `issue view`, `issue edit`, `issue close`, `issue reopen`, `issue create`, `issue comment`)
- URL parsing command (`parse`)
- Configuration file support (`~/.gitcode/config.json`)
- Token priority: environment variable > config file
- JSON output format support for most commands
- Comprehensive error handling

### Features
- Commander.js-based CLI framework
- Integration with `@xbghc/gitcode-api` for API calls
- Integration with `@xbghc/git-lib` for Git operations
- Support for Node.js 22+

[unreleased]: https://github.com/xbghc/gitany-actions/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/xbghc/gitany-actions/releases/tag/v0.0.1
