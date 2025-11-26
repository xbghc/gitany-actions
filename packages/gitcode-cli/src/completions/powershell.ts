// PowerShell completion script for gitcode CLI
export const powershellCompletion = `
# gitcode PowerShell completion script
#
# Installation:
#   gitcode completion powershell >> $PROFILE
# Or save to a file and dot-source it:
#   gitcode completion powershell > gitcode.ps1
#   . ./gitcode.ps1

using namespace System.Management.Automation
using namespace System.Management.Automation.Language

Register-ArgumentCompleter -Native -CommandName gitcode -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @{
        '' = @(
            @{ Name = 'status'; Description = 'Show current user and git repository status' }
            @{ Name = 'parse'; Description = 'Parse Git URL and output JSON' }
            @{ Name = 'auth'; Description = 'Authentication commands' }
            @{ Name = 'repo'; Description = 'Repository commands' }
            @{ Name = 'pr'; Description = 'Pull request commands' }
            @{ Name = 'user'; Description = 'User commands' }
            @{ Name = 'issue'; Description = 'Manage GitCode issues' }
            @{ Name = 'completion'; Description = 'Generate shell completion scripts' }
        )
        'auth' = @(
            @{ Name = 'set-token'; Description = 'Set authentication token' }
            @{ Name = 'remove-token'; Description = 'Remove authentication token' }
            @{ Name = 'status'; Description = 'Show authentication status' }
            @{ Name = 'login'; Description = 'Login via OAuth 2.0' }
            @{ Name = 'logout'; Description = 'Logout and remove all authentication data' }
        )
        'repo' = @(
            @{ Name = 'permission'; Description = "Show current user's role on a repo" }
            @{ Name = 'notifications'; Description = 'Get repository notifications' }
            @{ Name = 'mark-read'; Description = 'Mark notifications as read by IDs' }
            @{ Name = 'info'; Description = 'Repository information commands' }
        )
        'repo info' = @(
            @{ Name = 'settings'; Description = 'Show repository settings' }
            @{ Name = 'branches'; Description = 'List repository branches' }
            @{ Name = 'commits'; Description = 'Show repository commits' }
            @{ Name = 'contributors'; Description = 'Show repository contributors' }
            @{ Name = 'webhooks'; Description = 'List repository webhooks' }
        )
        'pr' = @(
            @{ Name = 'list'; Description = 'List pull requests for a repository' }
            @{ Name = 'create'; Description = 'Create a new pull request' }
            @{ Name = 'checkout'; Description = 'Check out a pull request in git' }
            @{ Name = 'comment'; Description = 'Create a comment on a pull request' }
            @{ Name = 'comments'; Description = 'List comments on a pull request' }
            @{ Name = 'info'; Description = 'Pull request information commands' }
        )
        'pr info' = @(
            @{ Name = 'settings'; Description = 'Show pull request settings' }
        )
        'user' = @(
            @{ Name = 'show'; Description = 'Show current user information' }
        )
        'issue' = @(
            @{ Name = 'list'; Description = 'List issues for a repository' }
            @{ Name = 'create'; Description = 'Create a new issue' }
            @{ Name = 'view'; Description = 'View issue details' }
            @{ Name = 'edit'; Description = 'Edit an issue' }
            @{ Name = 'close'; Description = 'Close an issue' }
            @{ Name = 'reopen'; Description = 'Reopen an issue' }
            @{ Name = 'comment'; Description = 'Create a comment on an issue' }
            @{ Name = 'edit-comment'; Description = 'Edit an issue comment' }
            @{ Name = 'status'; Description = 'Show issue statistics' }
        )
        'completion' = @(
            @{ Name = 'bash'; Description = 'Generate bash completion script' }
            @{ Name = 'zsh'; Description = 'Generate zsh completion script' }
            @{ Name = 'fish'; Description = 'Generate fish completion script' }
            @{ Name = 'powershell'; Description = 'Generate PowerShell completion script' }
        )
    }

    $options = @{
        'status' = @('--json', '--help')
        'pr list' = @('--state', '--head', '--base', '--sort', '--direction', '--json', '--help')
        'pr create' = @('--title', '--head', '--base', '--body', '--issue', '--json', '--help')
        'pr checkout' = @('-b', '--branch', '--help')
        'pr comment' = @('--body', '--json', '--help')
        'pr comments' = @('--page', '--perPage', '--commentType', '--json', '--help')
        'issue list' = @('-s', '--state', '--label', '--page', '--per-page', '-L', '--limit', '--json', '--help')
        'issue create' = @('-t', '--title', '-b', '--body', '-F', '--body-file', '-e', '--editor', '-a', '--assignee', '-l', '--label', '-m', '--milestone', '--security-hole', '--template-path', '--json', '-R', '--repo', '--help')
        'issue view' = @('--comments', '--page', '--per-page', '--json', '-R', '--repo', '--help')
        'issue edit' = @('-t', '--title', '-b', '--body', '-a', '--assignee', '-l', '--label', '-m', '--milestone', '--json', '-R', '--repo', '--help')
        'issue close' = @('--json', '-R', '--repo', '--help')
        'issue reopen' = @('--json', '-R', '--repo', '--help')
        'issue comment' = @('--body', '--json', '-R', '--repo', '--help')
        'issue edit-comment' = @('--body', '--json', '-R', '--repo', '--help')
        'issue status' = @('--json', '--help')
        'repo permission' = @('--json', '--help')
        'repo notifications' = @('--json', '--read', '--type', '--since', '--before', '--help')
        'repo mark-read' = @('--json', '--help')
        'repo info settings' = @('-R', '--repo', '--help')
        'repo info branches' = @('-R', '--repo', '--help')
        'repo info commits' = @('-R', '--repo', '--help')
        'repo info contributors' = @('-R', '--repo', '--help')
        'repo info webhooks' = @('-R', '--repo', '--help')
    }

    $optionValues = @{
        '--state' = @('open', 'closed', 'all')
        '-s' = @('open', 'closed', 'all')
        '--direction' = @('asc', 'desc')
        '--type' = @('all', 'event', 'referer')
        '--commentType' = @('diff_comment', 'pr_comment')
    }

    # Parse command elements
    $elements = $commandAst.CommandElements
    $cmdParts = @()

    for ($i = 1; $i -lt $elements.Count; $i++) {
        $elem = $elements[$i].Extent.Text
        if (-not $elem.StartsWith('-')) {
            $cmdParts += $elem
        }
    }

    # Build command path for lookup
    $cmdPath = ($cmdParts -join ' ').Trim()

    # Check if we're completing an option value
    $lastElement = if ($elements.Count -gt 1) { $elements[-1].Extent.Text } else { '' }
    $prevElement = if ($elements.Count -gt 2) { $elements[-2].Extent.Text } else { '' }

    if ($optionValues.ContainsKey($prevElement)) {
        $optionValues[$prevElement] | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
    }

    # Check if completing options
    if ($wordToComplete.StartsWith('-')) {
        $optKey = $cmdPath
        if ($options.ContainsKey($optKey)) {
            $options[$optKey] | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [CompletionResult]::new($_, $_, 'ParameterName', $_)
            }
        }
        return
    }

    # Complete subcommands
    $lookupKey = if ($cmdParts.Count -eq 0) { '' }
                 elseif ($cmdParts.Count -eq 1) { $cmdParts[0] }
                 else { "$($cmdParts[0]) $($cmdParts[1])" }

    # Adjust lookup for nested commands
    if ($cmdParts.Count -ge 2 -and $commands.ContainsKey("$($cmdParts[0]) $($cmdParts[1])")) {
        $lookupKey = "$($cmdParts[0]) $($cmdParts[1])"
    } elseif ($cmdParts.Count -ge 1 -and $commands.ContainsKey($cmdParts[0])) {
        $lookupKey = $cmdParts[0]
    } else {
        $lookupKey = ''
    }

    if ($commands.ContainsKey($lookupKey)) {
        $commands[$lookupKey] | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [CompletionResult]::new($_.Name, $_.Name, 'Command', $_.Description)
        }
    }
}
`.trim();
