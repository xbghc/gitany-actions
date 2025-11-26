/* eslint-disable no-useless-escape */
// Fish completion script for gitcode CLI
export const fishCompletion = `
###-begin-gitcode-completions-###
#
# gitcode command completion script for Fish shell
#
# Installation: gitcode completion fish > ~/.config/fish/completions/gitcode.fish
#

# Disable file completions for gitcode command
complete -c gitcode -f

# Helper functions
function __fish_gitcode_needs_command
    set -l cmd (commandline -opc)
    if test (count $cmd) -eq 1
        return 0
    end
    return 1
end

function __fish_gitcode_using_command
    set -l cmd (commandline -opc)
    if test (count $cmd) -gt 1
        if test "$argv[1]" = "$cmd[2]"
            return 0
        end
    end
    return 1
end

function __fish_gitcode_using_subcommand
    set -l cmd (commandline -opc)
    if test (count $cmd) -gt 2
        if test "$argv[1]" = "$cmd[2]" -a "$argv[2]" = "$cmd[3]"
            return 0
        end
    end
    return 1
end

# Main commands
complete -c gitcode -n __fish_gitcode_needs_command -a status -d 'Show current user and git repository status'
complete -c gitcode -n __fish_gitcode_needs_command -a parse -d 'Parse Git URL and output JSON'
complete -c gitcode -n __fish_gitcode_needs_command -a auth -d 'Authentication commands'
complete -c gitcode -n __fish_gitcode_needs_command -a repo -d 'Repository commands'
complete -c gitcode -n __fish_gitcode_needs_command -a pr -d 'Pull request commands'
complete -c gitcode -n __fish_gitcode_needs_command -a user -d 'User commands'
complete -c gitcode -n __fish_gitcode_needs_command -a issue -d 'Manage GitCode issues'
complete -c gitcode -n __fish_gitcode_needs_command -a completion -d 'Generate shell completion scripts'

# status command options
complete -c gitcode -n '__fish_gitcode_using_command status' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_command status' -l help -d 'Show help'

# parse command options
complete -c gitcode -n '__fish_gitcode_using_command parse' -l help -d 'Show help'

# auth subcommands
complete -c gitcode -n '__fish_gitcode_using_command auth' -a set-token -d 'Set authentication token'
complete -c gitcode -n '__fish_gitcode_using_command auth' -a remove-token -d 'Remove authentication token'
complete -c gitcode -n '__fish_gitcode_using_command auth' -a status -d 'Show authentication status'
complete -c gitcode -n '__fish_gitcode_using_command auth' -a login -d 'Login via OAuth 2.0'
complete -c gitcode -n '__fish_gitcode_using_command auth' -a logout -d 'Logout and remove all authentication data'

# repo subcommands
complete -c gitcode -n '__fish_gitcode_using_command repo' -a permission -d 'Show current user\\'s role on a repo'
complete -c gitcode -n '__fish_gitcode_using_command repo' -a notifications -d 'Get repository notifications'
complete -c gitcode -n '__fish_gitcode_using_command repo' -a mark-read -d 'Mark notifications as read by IDs'
complete -c gitcode -n '__fish_gitcode_using_command repo' -a info -d 'Repository information commands'

# repo permission options
complete -c gitcode -n '__fish_gitcode_using_subcommand repo permission' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo permission' -l help -d 'Show help'

# repo notifications options
complete -c gitcode -n '__fish_gitcode_using_subcommand repo notifications' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo notifications' -l read -d 'Show read notifications'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo notifications' -l type -d 'Filter by type' -xa 'all event referer'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo notifications' -l since -d 'Show notifications updated after this time'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo notifications' -l before -d 'Show notifications updated before this time'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo notifications' -l help -d 'Show help'

# repo mark-read options
complete -c gitcode -n '__fish_gitcode_using_subcommand repo mark-read' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo mark-read' -l help -d 'Show help'

# repo info subcommands
complete -c gitcode -n '__fish_gitcode_using_subcommand repo info' -a settings -d 'Show repository settings'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo info' -a branches -d 'List repository branches'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo info' -a commits -d 'Show repository commits'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo info' -a contributors -d 'Show repository contributors'
complete -c gitcode -n '__fish_gitcode_using_subcommand repo info' -a webhooks -d 'List repository webhooks'

# pr subcommands
complete -c gitcode -n '__fish_gitcode_using_command pr' -a list -d 'List pull requests for a repository'
complete -c gitcode -n '__fish_gitcode_using_command pr' -a create -d 'Create a new pull request'
complete -c gitcode -n '__fish_gitcode_using_command pr' -a checkout -d 'Check out a pull request in git'
complete -c gitcode -n '__fish_gitcode_using_command pr' -a comment -d 'Create a comment on a pull request'
complete -c gitcode -n '__fish_gitcode_using_command pr' -a comments -d 'List comments on a pull request'
complete -c gitcode -n '__fish_gitcode_using_command pr' -a info -d 'Pull request information commands'

# pr list options
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l state -d 'Filter by state' -xa 'open closed all'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l head -d 'Filter by head'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l base -d 'Filter by base branch'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l sort -d 'Sort field'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l direction -d 'Sort direction' -xa 'asc desc'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr list' -l help -d 'Show help'

# pr create options
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l title -d 'Title of the PR'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l head -d 'Source branch name'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l base -d 'Target branch'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l body -d 'Description/body text'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l issue -d 'Associate an issue number'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr create' -l help -d 'Show help'

# pr checkout options
complete -c gitcode -n '__fish_gitcode_using_subcommand pr checkout' -s b -l branch -d 'Local branch name'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr checkout' -l help -d 'Show help'

# pr comment options
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comment' -l body -d 'Comment body'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comment' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comment' -l help -d 'Show help'

# pr comments options
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comments' -l page -d 'Page number'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comments' -l perPage -d 'Items per page'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comments' -l commentType -d 'Comment type' -xa 'diff_comment pr_comment'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comments' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand pr comments' -l help -d 'Show help'

# pr info subcommands
complete -c gitcode -n '__fish_gitcode_using_subcommand pr info' -a settings -d 'Show pull request settings'

# user subcommands
complete -c gitcode -n '__fish_gitcode_using_command user' -a show -d 'Show current user information'

# issue subcommands
complete -c gitcode -n '__fish_gitcode_using_command issue' -a list -d 'List issues for a repository'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a ls -d 'List issues for a repository'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a create -d 'Create a new issue'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a view -d 'View issue details'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a edit -d 'Edit an issue'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a close -d 'Close an issue'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a reopen -d 'Reopen an issue'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a comment -d 'Create a comment on an issue'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a edit-comment -d 'Edit an issue comment'
complete -c gitcode -n '__fish_gitcode_using_command issue' -a status -d 'Show issue statistics'

# issue list options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -s s -l state -d 'Filter by state' -xa 'open closed all'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -l label -d 'Comma-separated labels'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -l page -d 'Page number'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -l per-page -d 'Items per page'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -s L -l limit -d 'Maximum number of issues'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue list' -l help -d 'Show help'

# issue ls options (alias)
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -s s -l state -d 'Filter by state' -xa 'open closed all'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -l label -d 'Comma-separated labels'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -l page -d 'Page number'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -l per-page -d 'Items per page'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -s L -l limit -d 'Maximum number of issues'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue ls' -l help -d 'Show help'

# issue create options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s t -l title -d 'Issue title'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s b -l body -d 'Issue body'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s F -l body-file -d 'Read body from file' -r
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s e -l editor -d 'Open editor'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s a -l assignee -d 'Assignee login'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s l -l label -d 'Label name'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s m -l milestone -d 'Milestone number'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -l security-hole -d 'Security hole level'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -l template-path -d 'Template path' -r
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue create' -l help -d 'Show help'

# issue view options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue view' -l comments -d 'Include issue comments'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue view' -l page -d 'Page number'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue view' -l per-page -d 'Items per page'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue view' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue view' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue view' -l help -d 'Show help'

# issue edit options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -s t -l title -d 'Issue title'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -s b -l body -d 'Issue body'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -s a -l assignee -d 'Assignee login'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -s l -l label -d 'Label name'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -s m -l milestone -d 'Milestone number'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit' -l help -d 'Show help'

# issue close/reopen options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue close' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue close' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue close' -l help -d 'Show help'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue reopen' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue reopen' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue reopen' -l help -d 'Show help'

# issue comment options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue comment' -l body -d 'Comment body'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue comment' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue comment' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue comment' -l help -d 'Show help'

# issue edit-comment options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit-comment' -l body -d 'Comment body'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit-comment' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit-comment' -s R -l repo -d 'Specify repository'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue edit-comment' -l help -d 'Show help'

# issue status options
complete -c gitcode -n '__fish_gitcode_using_subcommand issue status' -l json -d 'Output raw JSON'
complete -c gitcode -n '__fish_gitcode_using_subcommand issue status' -l help -d 'Show help'

# completion subcommands
complete -c gitcode -n '__fish_gitcode_using_command completion' -a bash -d 'Generate bash completion script'
complete -c gitcode -n '__fish_gitcode_using_command completion' -a zsh -d 'Generate zsh completion script'
complete -c gitcode -n '__fish_gitcode_using_command completion' -a fish -d 'Generate fish completion script'

###-end-gitcode-completions-###
`.trim();
