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
- `--labels <labels>`: Comma-separated labels
- `--page <n>`: Page number
- `--per-page <n>`: Items per page
- `-L, --limit <n>`: Maximum number of issues to return
- `--json`: Output raw JSON instead of list

**Examples**
```bash
# List open issues
gitcode issue list https://gitcode.com/owner/repo

# List issues with specific labels
gitcode issue list https://gitcode.com/owner/repo --labels bug,enhancement

# List closed issues
gitcode issue list https://gitcode.com/owner/repo --state closed

# Output JSON format
gitcode issue list https://gitcode.com/owner/repo --json
```

### 2. List Comments

```bash
gitcode issue comments <url> <number> [options]
```

**Arguments**
- `<url>`: Repository URL
- `<number>`: Issue number

**Options**
- `--page <n>`: Page number
- `--per-page <n>`: Items per page
- `--json`: Output raw JSON instead of list

**Examples**
```bash
# List comments for issue #123
gitcode issue comments https://gitcode.com/owner/repo 123

# List comments with pagination
gitcode issue comments https://gitcode.com/owner/repo 123 --page 2 --per-page 10
```

### 3. Create Issue

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
  --labels bug,critical \
  --milestone 1

# Create issue using editor
gitcode issue create myusername my-repo -e

# Create issue using --repo flag
gitcode issue create --repo myusername/my-repo "New issue"

# Output JSON format
gitcode issue create myusername my-repo "Test issue" --json
```

### 4. Create Comment

```bash
gitcode issue comment <issue> [body] [options]
```

**Arguments**
- `<issue>`: Issue URL, number, or OWNER/REPO/NUMBER
- `[body]`: Comment body (will prompt if not provided)

**Options**
- `-b, --body <string>`: Supply a comment body
- `-F, --body-file <file>`: Read body text from file (use "-" to read from standard input)
- `-e, --editor`: Open text editor to write the comment
- `--json`: Output raw JSON instead of formatted output
- `-R, --repo <[HOST/]OWNER/REPO>`: Select another repository using the [HOST/]OWNER/REPO format

**Examples**
```bash
# Create a simple comment
gitcode issue comment owner/repo/123 "This looks good to me"

# Create comment on issue URL
gitcode issue comment https://gitcode.com/owner/repo/issues/123 "LGTM"

# Create comment using editor
gitcode issue comment owner/repo/123 -e

# Create comment using --repo flag
gitcode issue comment 123 --repo owner/repo "My comment"

# Read comment from file
gitcode issue comment owner/repo/123 -F comment.txt

# Output JSON format
gitcode issue comment owner/repo/123 "Test comment" --json
```

### 5. Issue Status

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

### 3. CI/CD Integration

Use GitCode issue commands in your CI/CD workflows:

```yaml
# .github/workflows/create-issue.yml
- name: Create Issue
  run: |
    gitcode issue create ${{ github.repository_owner }} ${{ github.event.repository.name }} \
      "Build failed: ${{ github.sha }}" \
      --body "Build failed in ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

## Command Output

### Standard Output

Commands provide rich, colored output with useful information:

```bash
$ gitcode issue create myusername my-repo "Test Issue"

🎉 Issue created successfully!

📋 Issue Details:
   Title:    Test Issue
   Number:   #456
   State:    open
   URL:      https://gitcode.com/myusername/my-repo/issues/456
   Assignee: developer
   Labels:   bug, enhancement

💡 Next steps:
   • View the issue: https://gitcode.com/myusername/my-repo/issues/456
   • Add labels:    gitcode issue edit 456 --label bug
   • Add assignee:  gitcode issue edit 456 --assignee @me
```

### JSON Output

Use `--json` flag to get machine-readable output:

```bash
$ gitcode issue create myusername my-repo "Test Issue" --json
{
  "id": 123456,
  "html_url": "https://gitcode.com/myusername/my-repo/issues/456",
  "number": "456",
  "state": "open",
  "title": "Test Issue",
  "body": "",
  "repository": {
    "id": 789012,
    "full_name": "myusername/my-repo",
    "human_name": "myusername / my-repo",
    "path": "my-repo",
    "name": "my-repo",
    "url": "https://gitcode.com/myusername/my-repo"
  },
  "created_at": "2024-01-15T10:30:00+08:00",
  "updated_at": "2024-01-15T10:30:00+08:00"
}
```

## GitHub CLI Compatibility

GitCode CLI issue commands are designed to be compatible with GitHub CLI patterns:

- **Short flags**: `-t` instead of `--title`, `-b` instead of `--body`
- **Interactive prompts**: Will prompt for missing required information
- **Editor integration**: Use `-e` to open your default editor
- **Web integration**: Use `-w` to open in browser
- **File input**: Use `-F` to read content from files
- **Multiple labels**: Use `-l` multiple times for different labels
- **@me support**: Use `@me` for self-assignment
- **Repository specification**: Use `-R` for flexible repository selection

## Common Workflows

### 1. Daily Issue Management
```bash
# Check repository status
gitcode issue status myusername/my-repo

# List recent issues
gitcode issue list myusername/my-repo --limit 10

# Create a new issue
gitcode issue create myusername/my-repo "Daily sync issue"
```

### 2. Issue Triage
```bash
# List all open issues
gitcode issue list myusername/my-repo --state open

# Comment on multiple issues
for issue in 123 456 789; do
  gitcode issue comment myusername/my-repo/$issue "Triaged: needs review"
done
```

### 3. Bulk Operations
```bash
# Create template issues
gitcode issue create myusername/my-repo "Documentation update needed" \
  --label documentation \
  --body "Please update the documentation for the recent changes"

# Add comments to multiple repositories
for repo in frontend backend docs; do
  gitcode issue comment myusername/$repo/1 "Deployed to production"
done
```