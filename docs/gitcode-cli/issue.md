---
title: Issue Commands
---

# GitCode Issue Commands

GitAny CLI provides comprehensive GitCode issue management functionality with GitHub CLI-style commands and options.

## Available Commands

### 1. List Issues

```bash
gitcode issue list <url> [options]
```

**Arguments**

- `<url>`: Repository URL or OWNER/REPO format (e.g., `https://gitcode.com/owner/repo` or `owner/repo`)

**Options**

- `-s, --state <state>`: Filter by state: open | closed | all (default: open)
- `--label <labels>`: Comma-separated labels
- `--page <n>`: Page number
- `--per-page <n>`: Items per page
- `-L, --limit <n>`: Maximum number of issues to return
- `--json`: Output raw JSON instead of list

**Examples**

```bash
# List open issues
gitcode issue list https://gitcode.com/owner/repo

# List issues with specific labels
gitcode issue list https://gitcode.com/owner/repo --label bug,enhancement

# List closed issues
gitcode issue list https://gitcode.com/owner/repo --state closed

# Output JSON format
gitcode issue list https://gitcode.com/owner/repo --json
```

### 2. View Issue

```bash
gitcode issue view <number> [url] [options]
```

**Arguments**

- `<number>`: Issue number
- `[url]`: Repository URL or OWNER/REPO (optional when running inside a Git repo)

**Options**

- `--comments`: Include comments in the output
- `--page <n>`: Page number when fetching comments
- `--per-page <n>`: Items per page when fetching comments
- `--json`: Output raw JSON instead of formatted text
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# View issue details
gitcode issue view 42 https://gitcode.com/owner/repo

# View issue with comments
gitcode issue view 42 --repo owner/repo --comments

# Output JSON
gitcode issue view 42 https://gitcode.com/owner/repo --json --comments
```

### 3. Edit Issue

```bash
gitcode issue edit <number> [url] [options]
```

**Arguments**

- `<number>`: Issue number
- `[url]`: Repository URL or OWNER/REPO

**Options**

- `-t, --title <string>`: Update the issue title
- `-b, --body <string>`: Update the issue body
- `-F, --body-file <file>`: Read the issue body from a file (use `-` for stdin)
- `-l, --label <name>`: Replace labels (can be used multiple times)
- `-a, --assignee <login>`: Set the assignee
- `-m, --milestone <number>`: Set the milestone number
- `--state <state>`: Update issue state: open | closed
- `--json`: Output raw JSON instead of formatted text
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# Update title and body
gitcode issue edit 42 owner/repo --title "New title" --body "Updated description"

# Replace labels and assign a user
gitcode issue edit 42 --repo owner/repo --label bug --label critical --assignee developer

# Close an issue directly
gitcode issue edit 42 owner/repo --state closed
```

### 4. Close Issue

```bash
gitcode issue close <number> [url] [options]
```

**Options**

- `--json`: Output raw JSON instead of formatted text
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# Close an issue
gitcode issue close 123 https://gitcode.com/owner/repo

# Close using repo flag
gitcode issue close 123 --repo owner/repo
```

### 5. Reopen Issue

```bash
gitcode issue reopen <number> [url] [options]
```

**Options**

- `--json`: Output raw JSON instead of formatted text
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# Reopen an issue
gitcode issue reopen 123 https://gitcode.com/owner/repo

# Reopen using repo flag
gitcode issue reopen 123 --repo owner/repo
```

### 6. Create Issue

```bash
gitcode issue create [owner] [repo] [title] [options]
```

**Arguments**

- `[owner]`: Repository owner (user or organization) - can be omitted if --repo is used
- `[repo]`: Repository name - can be omitted if --repo is used
- `[title]`: Issue title - will prompt if not provided

**Options**

- `-t, --title <string>`: Supply a title. Will prompt for one otherwise
- `-b, --body <string>`: Supply a body. Will prompt for one otherwise
- `-F, --body-file <file>`: Read body text from file (use "-" to read from standard input)
- `-e, --editor`: Skip prompts and open the text editor to write the title and body
- `-a, --assignee <login>`: Assign people by their login. Use "@me" to self-assign
- `-l, --label <name>`: Add labels by name (can be used multiple times)
- `-m, --milestone <number>`: Add the issue to a milestone by number
- `--security-hole <security-hole>`: Security hole level
- `--template-path <template-path>`: Template path
- `--json`: Output raw JSON instead of formatted output
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# Create a simple issue
gitcode issue create myusername my-repo "Found a bug"

# Create issue with body
gitcode issue create myusername my-repo "Feature request" \
  --body "I would like to request a new feature..."

# Create issue with assignee and labels
gitcode issue create myusername my-repo "Critical bug" \
  --body "Application crashes on startup" \
  --assignee developer \
  --label bug \
  --label critical \
  --milestone 1

# Create issue using editor
gitcode issue create myusername my-repo -e

# Create issue using --repo flag
gitcode issue create --repo myusername/my-repo "New issue"

# Output JSON format
gitcode issue create myusername my-repo "Test issue" --json
```

### 7. Create Comment

```bash
gitcode issue comment <issue> [body] [options]
```

**Arguments**

- `<issue>`: Issue URL, number, or OWNER/REPO/NUMBER
- `[body]`: Comment body. Required unless using `--body` or `--body-file`

**Options**

- `-b, --body <string>`: Supply a comment body
- `-F, --body-file <file>`: Read body text from a file
- `--json`: Output raw JSON instead of formatted output
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# Create a simple comment
gitcode issue comment owner/repo/123 "This looks good to me"

# Create comment on issue URL
gitcode issue comment https://gitcode.com/owner/repo/issues/123 "LGTM"

# Create comment using --repo flag
gitcode issue comment 123 --repo owner/repo "My comment"

# Read comment from file
gitcode issue comment owner/repo/123 -F comment.txt

# Output JSON format
gitcode issue comment owner/repo/123 "Test comment" --json
```

### 8. Issue Status

```bash
gitcode issue status <url> [options]
```

**Aliases:** `gitcode issue st`

**Arguments**

- `<url>`: Repository URL or OWNER/REPO

**Options**

- `--json`: Output raw JSON instead of formatted status
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**

```bash
# Show issue status for a repository
gitcode issue status owner/repo

# Show status using full URL
gitcode issue status https://gitcode.com/owner/repo

# Output JSON format
gitcode issue status owner/repo --json
```

## Advanced Usage

### 1. Authentication

Set up GitCode authentication before using issue commands:

```bash
# Login with GitCode token
gitcode auth login <your-token>
```

### 2. Batch Operations

Use shell scripting to automate issue operations:

```bash
# Create issues in multiple repositories
for repo in repo1 repo2 repo3; do
  gitcode issue create myusername "$repo" "Initial setup issue" \
    --body "This issue tracks the initial setup for $repo"
done
```
