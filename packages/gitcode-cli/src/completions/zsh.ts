/* eslint-disable no-useless-escape */
// Zsh completion script for gitcode CLI
export const zshCompletion = `
#compdef gitcode
###-begin-gitcode-completions-###
#
# gitcode command completion script for Zsh
#
# Installation: gitcode completion zsh > ~/.zsh/completions/_gitcode
# Then add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)
# And run: autoload -Uz compinit && compinit
#

_gitcode() {
    local -a commands
    local -a auth_commands
    local -a repo_commands
    local -a repo_info_commands
    local -a pr_commands
    local -a pr_info_commands
    local -a user_commands
    local -a issue_commands
    local -a completion_commands

    commands=(
        'status:Show current user and git repository status'
        'parse:Parse Git URL and output JSON'
        'auth:Authentication commands'
        'repo:Repository commands'
        'pr:Pull request commands'
        'user:User commands'
        'issue:Manage GitCode issues'
        'completion:Generate shell completion scripts'
    )

    auth_commands=(
        'set-token:Set authentication token'
        'remove-token:Remove authentication token'
        'status:Show authentication status'
        'login:Login via OAuth 2.0 (browser flow)'
        'logout:Logout and remove all authentication data'
    )

    repo_commands=(
        'permission:Show current user'"'"'s role on a repo'
        'notifications:Get repository notifications'
        'mark-read:Mark notifications as read by IDs'
        'info:Repository information commands'
    )

    repo_info_commands=(
        'settings:Show repository settings'
        'branches:List repository branches'
        'commits:Show repository commits'
        'contributors:Show repository contributors'
        'webhooks:List repository webhooks'
    )

    pr_commands=(
        'list:List pull requests for a repository'
        'create:Create a new pull request'
        'checkout:Check out a pull request in git'
        'comment:Create a comment on a pull request'
        'comments:List comments on a pull request'
        'info:Pull request information commands'
    )

    pr_info_commands=(
        'settings:Show pull request settings'
    )

    user_commands=(
        'show:Show current user information'
    )

    issue_commands=(
        'list:List issues for a repository'
        'create:Create a new issue'
        'view:View issue details'
        'edit:Edit an issue'
        'close:Close an issue'
        'reopen:Reopen an issue'
        'comment:Create a comment on an issue'
        'edit-comment:Edit an issue comment'
        'status:Show issue statistics'
    )

    completion_commands=(
        'bash:Generate bash completion script'
        'zsh:Generate zsh completion script'
        'fish:Generate fish completion script'
    )

    _arguments -C \\
        '1: :->command' \\
        '*:: :->args'

    case "$state" in
        command)
            _describe -t commands 'gitcode commands' commands
            ;;
        args)
            case "$words[1]" in
                auth)
                    _arguments -C \\
                        '1: :->auth_command' \\
                        '*:: :->auth_args'
                    case "$state" in
                        auth_command)
                            _describe -t auth_commands 'auth commands' auth_commands
                            ;;
                        auth_args)
                            case "$words[1]" in
                                set-token)
                                    _arguments \\
                                        '1:token:' \\
                                        '--help[Show help]'
                                    ;;
                                *)
                                    _arguments '--help[Show help]'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                repo)
                    _arguments -C \\
                        '1: :->repo_command' \\
                        '*:: :->repo_args'
                    case "$state" in
                        repo_command)
                            _describe -t repo_commands 'repo commands' repo_commands
                            ;;
                        repo_args)
                            case "$words[1]" in
                                permission)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                notifications)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '--json[Output raw JSON]' \\
                                        '--read[Show read notifications]' \\
                                        '--type[Filter by type]:type:(all event referer)' \\
                                        '--since[Show notifications updated after this time]:datetime:' \\
                                        '--before[Show notifications updated before this time]:datetime:' \\
                                        '--help[Show help]'
                                    ;;
                                mark-read)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '*:ids:' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                info)
                                    _arguments -C \\
                                        '1: :->info_command' \\
                                        '*:: :->info_args'
                                    case "$state" in
                                        info_command)
                                            _describe -t repo_info_commands 'repo info commands' repo_info_commands
                                            ;;
                                        info_args)
                                            _arguments \\
                                                '-R[Specify repository]:repo:' \\
                                                '--repo[Specify repository]:repo:' \\
                                                '--help[Show help]'
                                            ;;
                                    esac
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                pr)
                    _arguments -C \\
                        '1: :->pr_command' \\
                        '*:: :->pr_args'
                    case "$state" in
                        pr_command)
                            _describe -t pr_commands 'pr commands' pr_commands
                            ;;
                        pr_args)
                            case "$words[1]" in
                                list)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '--state[Filter by state]:state:(open closed all)' \\
                                        '--head[Filter by head]:ref:' \\
                                        '--base[Filter by base branch]:branch:' \\
                                        '--sort[Sort field]:field:' \\
                                        '--direction[Sort direction]:direction:(asc desc)' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                create)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '--title[Title of the PR]:title:' \\
                                        '--head[Source branch name]:branch:' \\
                                        '--base[Target branch]:branch:' \\
                                        '--body[Description/body text]:text:' \\
                                        '--issue[Associate an issue number]:number:' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                checkout)
                                    _arguments \\
                                        '1:number:' \\
                                        '2::url:_files' \\
                                        '-b[Local branch name]:branch:' \\
                                        '--branch[Local branch name]:branch:' \\
                                        '--help[Show help]'
                                    ;;
                                comment)
                                    _arguments \\
                                        '1:number:' \\
                                        '2::url:_files' \\
                                        '--body[Comment body]:text:' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                comments)
                                    _arguments \\
                                        '1:pr-number:' \\
                                        '2::url:_files' \\
                                        '--page[Page number]:number:' \\
                                        '--perPage[Items per page]:number:' \\
                                        '--commentType[Comment type]:type:(diff_comment pr_comment)' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                info)
                                    _arguments -C \\
                                        '1: :->info_command' \\
                                        '*:: :->info_args'
                                    case "$state" in
                                        info_command)
                                            _describe -t pr_info_commands 'pr info commands' pr_info_commands
                                            ;;
                                        info_args)
                                            _arguments \\
                                                '-R[Specify repository]:repo:' \\
                                                '--repo[Specify repository]:repo:' \\
                                                '--help[Show help]'
                                            ;;
                                    esac
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                user)
                    _arguments -C \\
                        '1: :->user_command' \\
                        '*:: :->user_args'
                    case "$state" in
                        user_command)
                            _describe -t user_commands 'user commands' user_commands
                            ;;
                        user_args)
                            _arguments '--help[Show help]'
                            ;;
                    esac
                    ;;
                issue)
                    _arguments -C \\
                        '1: :->issue_command' \\
                        '*:: :->issue_args'
                    case "$state" in
                        issue_command)
                            _describe -t issue_commands 'issue commands' issue_commands
                            ;;
                        issue_args)
                            case "$words[1]" in
                                list|ls)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '-s[Filter by state]:state:(open closed all)' \\
                                        '--state[Filter by state]:state:(open closed all)' \\
                                        '--label[Comma-separated labels]:labels:' \\
                                        '--page[Page number]:number:' \\
                                        '--per-page[Items per page]:number:' \\
                                        '-L[Maximum number of issues]:number:' \\
                                        '--limit[Maximum number of issues]:number:' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                                create)
                                    _arguments \\
                                        '1::owner:' \\
                                        '2::repo:' \\
                                        '3::title:' \\
                                        '-t[Issue title]:title:' \\
                                        '--title[Issue title]:title:' \\
                                        '-b[Issue body]:body:' \\
                                        '--body[Issue body]:body:' \\
                                        '-F[Read body from file]:file:_files' \\
                                        '--body-file[Read body from file]:file:_files' \\
                                        '-e[Open editor]' \\
                                        '--editor[Open editor]' \\
                                        '*-a[Assignee login]:login:' \\
                                        '*--assignee[Assignee login]:login:' \\
                                        '*-l[Label name]:label:' \\
                                        '*--label[Label name]:label:' \\
                                        '-m[Milestone number]:number:' \\
                                        '--milestone[Milestone number]:number:' \\
                                        '--security-hole[Security hole level]:level:' \\
                                        '--template-path[Template path]:path:_files' \\
                                        '--json[Output raw JSON]' \\
                                        '-R[Specify repository]:repo:' \\
                                        '--repo[Specify repository]:repo:' \\
                                        '--help[Show help]'
                                    ;;
                                view)
                                    _arguments \\
                                        '1:number:' \\
                                        '2::url:_files' \\
                                        '--comments[Include issue comments]' \\
                                        '--page[Page number]:number:' \\
                                        '--per-page[Items per page]:number:' \\
                                        '--json[Output raw JSON]' \\
                                        '-R[Specify repository]:repo:' \\
                                        '--repo[Specify repository]:repo:' \\
                                        '--help[Show help]'
                                    ;;
                                edit)
                                    _arguments \\
                                        '1:number:' \\
                                        '2::url:_files' \\
                                        '-t[Issue title]:title:' \\
                                        '--title[Issue title]:title:' \\
                                        '-b[Issue body]:body:' \\
                                        '--body[Issue body]:body:' \\
                                        '*-a[Assignee login]:login:' \\
                                        '*--assignee[Assignee login]:login:' \\
                                        '*-l[Label name]:label:' \\
                                        '*--label[Label name]:label:' \\
                                        '-m[Milestone number]:number:' \\
                                        '--milestone[Milestone number]:number:' \\
                                        '--json[Output raw JSON]' \\
                                        '-R[Specify repository]:repo:' \\
                                        '--repo[Specify repository]:repo:' \\
                                        '--help[Show help]'
                                    ;;
                                close|reopen)
                                    _arguments \\
                                        '1:number:' \\
                                        '2::url:_files' \\
                                        '--json[Output raw JSON]' \\
                                        '-R[Specify repository]:repo:' \\
                                        '--repo[Specify repository]:repo:' \\
                                        '--help[Show help]'
                                    ;;
                                comment)
                                    _arguments \\
                                        '1:number:' \\
                                        '2::url:_files' \\
                                        '--body[Comment body]:text:' \\
                                        '--json[Output raw JSON]' \\
                                        '-R[Specify repository]:repo:' \\
                                        '--repo[Specify repository]:repo:' \\
                                        '--help[Show help]'
                                    ;;
                                edit-comment)
                                    _arguments \\
                                        '1:comment-id:' \\
                                        '2::url:_files' \\
                                        '--body[Comment body]:text:' \\
                                        '--json[Output raw JSON]' \\
                                        '-R[Specify repository]:repo:' \\
                                        '--repo[Specify repository]:repo:' \\
                                        '--help[Show help]'
                                    ;;
                                status)
                                    _arguments \\
                                        '1::url:_files' \\
                                        '--json[Output raw JSON]' \\
                                        '--help[Show help]'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                completion)
                    _arguments -C \\
                        '1: :->completion_command' \\
                        '*:: :->completion_args'
                    case "$state" in
                        completion_command)
                            _describe -t completion_commands 'completion commands' completion_commands
                            ;;
                    esac
                    ;;
                status)
                    _arguments \\
                        '--json[Output raw JSON]' \\
                        '--help[Show help]'
                    ;;
                parse)
                    _arguments \\
                        '1::url:_files' \\
                        '--help[Show help]'
                    ;;
            esac
            ;;
    esac
}

_gitcode "$@"
###-end-gitcode-completions-###
`.trim();
