# @gitany/gitcode

The primary library for interacting with the GitCode API. It provides a full, type-safe client for all supported API endpoints.

## Installation

```bash
pnpm add @gitany/gitcode
```

## Usage

The main entry point is the `GitcodeClient`. It provides access to different resource-specific clients.

```typescript
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// Get user profile
const user = await client.user.getProfile();

// List repository issues
const issues = await client.issues.list({
  owner: 'owner',
  repo: 'repo',
  query: { state: 'open' },
});

// Create a new pull request
const newPr = await client.pulls.create({
  owner: 'owner',
  repo: 'repo',
  body: {
    title: 'My New Feature',
    head: 'feature-branch',
    base: 'main',
  },
});
```

## API Structure

The client is organized by resource:

-   `client.user`: Methods related to users.
    -   `.getProfile()`
    -   `.getNamespace()`
-   `client.repo`: Methods related to repositories.
    -   `.getSettings({ owner, repo })`
    -   `.getBranches({ owner, repo })`
    -   `.getCommits({ owner, repo })`
    -   ... and more
-   `client.issues`: Methods related to issues.
    -   `.list({ owner, repo, query })`
    -   `.get({ owner, repo, issueNumber })`
    -   `.create({ owner, body })`
    -   ... and more
-   `client.pulls`: Methods related to pull requests.
    -   `.list({ owner, repo, query })`
    -   `.create({ owner, repo, body })`
    -   ... and more
-   `client.auth`: Methods for authentication.
    -   `.login()`
    -   `.token()`

All methods return Promises and are fully typed. All parameters are passed as a single object for consistency and extensibility.
