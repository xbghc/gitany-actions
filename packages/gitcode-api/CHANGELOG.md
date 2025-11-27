# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.2] - 2025-11-27

### Added

- Notification API support for repositories
  - `client.repo.getNotifications()` - Get repository notifications with filtering options
  - `client.repo.markNotificationsRead()` - Mark notifications as read in batch
  - Complete type definitions: `Notification`, `NotificationsResponse`, `NotificationQuery`, `MarkNotificationsReadParams`
  - Zod schemas for notification data validation

### Removed

- **BREAKING CHANGE**: Removed UserNamespace endpoint
  - Removed `client.user.getNamespace()` method
  - Removed `UserNamespace` type and `userNamespaceSchema`
  - Removed `userNamespaceUrl()` function

## [0.0.1] - 2024-01-15

### Added

- Initial release of GitCode API client library
- `GitCodeClient` main client class with modular architecture
- `GitCodeAuth` for authentication management
- `GitCodeClientPr` for Pull Request operations (create, list, comments, count)
- `GitCodeClientRepo` for Repository operations (settings, branches, commits, webhooks, permissions, contributors)
- `GitCodeClientUser` for User profile operations (getProfile)
- `GitCodeClientIssue` for Issue operations (create, list, update, comments, get, close, reopen)
- Complete type definitions with Zod validation
- HTTP utilities with retry and caching support
- API constants and configuration
- URL parsing utilities for GitCode URLs

### Features

- Type-safe API wrappers using TypeScript and Zod
- Modular client architecture (user, repo, pr, issue modules)
- Built on `got` HTTP client
- Support for environment variable and config file authentication
- Comprehensive error handling
- ESM module support
- Support for Node.js 22+

[unreleased]: https://github.com/xbghc/gitcode-actions/compare/gitcode-api-v0.0.2...HEAD
[0.0.2]: https://github.com/xbghc/gitcode-actions/compare/gitcode-api-v0.0.1...gitcode-api-v0.0.2
[0.0.1]: https://github.com/xbghc/gitcode-actions/releases/tag/gitcode-api-v0.0.1
