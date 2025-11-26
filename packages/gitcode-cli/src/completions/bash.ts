/* eslint-disable no-useless-escape */
// Bash completion script for gitcode CLI
export const bashCompletion = `
###-begin-gitcode-completions-###
#
# gitcode command completion script
#
# Installation: gitcode completion bash >> ~/.bashrc
# Or: gitcode completion bash > /etc/bash_completion.d/gitcode
#

_gitcode_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="status parse auth repo pr user issue completion"
    local auth_commands="set-token remove-token status login logout"
    local repo_commands="permission notifications mark-read info"
    local repo_info_commands="settings branches commits contributors webhooks"
    local pr_commands="list create checkout comment comments info"
    local pr_info_commands="settings"
    local user_commands="show"
    local issue_commands="list create view edit close reopen comment edit-comment status"
    local completion_commands="bash zsh fish"

    # State options
    local state_options="open closed all"
    local direction_options="asc desc"
    local notification_type_options="all event referer"
    local comment_type_options="diff_comment pr_comment"

    case "\${cword}" in
        1)
            COMPREPLY=( \$(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        2)
            case "\${prev}" in
                auth)
                    COMPREPLY=( \$(compgen -W "\${auth_commands}" -- "\${cur}") )
                    return 0
                    ;;
                repo)
                    COMPREPLY=( \$(compgen -W "\${repo_commands}" -- "\${cur}") )
                    return 0
                    ;;
                pr)
                    COMPREPLY=( \$(compgen -W "\${pr_commands}" -- "\${cur}") )
                    return 0
                    ;;
                user)
                    COMPREPLY=( \$(compgen -W "\${user_commands}" -- "\${cur}") )
                    return 0
                    ;;
                issue)
                    COMPREPLY=( \$(compgen -W "\${issue_commands}" -- "\${cur}") )
                    return 0
                    ;;
                completion)
                    COMPREPLY=( \$(compgen -W "\${completion_commands}" -- "\${cur}") )
                    return 0
                    ;;
            esac
            ;;
        3)
            case "\${words[1]}" in
                repo)
                    if [[ "\${prev}" == "info" ]]; then
                        COMPREPLY=( \$(compgen -W "\${repo_info_commands}" -- "\${cur}") )
                        return 0
                    fi
                    ;;
                pr)
                    if [[ "\${prev}" == "info" ]]; then
                        COMPREPLY=( \$(compgen -W "\${pr_info_commands}" -- "\${cur}") )
                        return 0
                    fi
                    ;;
            esac
            ;;
    esac

    # Handle options based on command context
    case "\${words[1]}" in
        status)
            COMPREPLY=( \$(compgen -W "--json --help" -- "\${cur}") )
            return 0
            ;;
        pr)
            case "\${words[2]}" in
                list)
                    case "\${prev}" in
                        --state|-s)
                            COMPREPLY=( \$(compgen -W "\${state_options}" -- "\${cur}") )
                            return 0
                            ;;
                        --direction)
                            COMPREPLY=( \$(compgen -W "\${direction_options}" -- "\${cur}") )
                            return 0
                            ;;
                        *)
                            COMPREPLY=( \$(compgen -W "--state --head --base --sort --direction --json --help" -- "\${cur}") )
                            return 0
                            ;;
                    esac
                    ;;
                create)
                    COMPREPLY=( \$(compgen -W "--title --head --base --body --issue --json --help" -- "\${cur}") )
                    return 0
                    ;;
                checkout)
                    COMPREPLY=( \$(compgen -W "-b --branch --help" -- "\${cur}") )
                    return 0
                    ;;
                comments)
                    case "\${prev}" in
                        --commentType)
                            COMPREPLY=( \$(compgen -W "\${comment_type_options}" -- "\${cur}") )
                            return 0
                            ;;
                        *)
                            COMPREPLY=( \$(compgen -W "--page --perPage --commentType --json --help" -- "\${cur}") )
                            return 0
                            ;;
                    esac
                    ;;
                comment)
                    COMPREPLY=( \$(compgen -W "--body --json --help" -- "\${cur}") )
                    return 0
                    ;;
            esac
            ;;
        issue)
            case "\${words[2]}" in
                list|ls)
                    case "\${prev}" in
                        --state|-s)
                            COMPREPLY=( \$(compgen -W "\${state_options}" -- "\${cur}") )
                            return 0
                            ;;
                        *)
                            COMPREPLY=( \$(compgen -W "-s --state --label --page --per-page -L --limit --json --help" -- "\${cur}") )
                            return 0
                            ;;
                    esac
                    ;;
                create)
                    COMPREPLY=( \$(compgen -W "-t --title -b --body -F --body-file -e --editor -a --assignee -l --label -m --milestone --security-hole --template-path --json -R --repo --help" -- "\${cur}") )
                    return 0
                    ;;
                view)
                    COMPREPLY=( \$(compgen -W "--comments --page --per-page --json -R --repo --help" -- "\${cur}") )
                    return 0
                    ;;
                edit)
                    COMPREPLY=( \$(compgen -W "-t --title -b --body -a --assignee -l --label -m --milestone --json -R --repo --help" -- "\${cur}") )
                    return 0
                    ;;
                close|reopen)
                    COMPREPLY=( \$(compgen -W "--json -R --repo --help" -- "\${cur}") )
                    return 0
                    ;;
                comment)
                    COMPREPLY=( \$(compgen -W "--body --json -R --repo --help" -- "\${cur}") )
                    return 0
                    ;;
                edit-comment)
                    COMPREPLY=( \$(compgen -W "--body --json -R --repo --help" -- "\${cur}") )
                    return 0
                    ;;
                status)
                    COMPREPLY=( \$(compgen -W "--json --help" -- "\${cur}") )
                    return 0
                    ;;
            esac
            ;;
        repo)
            case "\${words[2]}" in
                permission)
                    COMPREPLY=( \$(compgen -W "--json --help" -- "\${cur}") )
                    return 0
                    ;;
                notifications)
                    case "\${prev}" in
                        --type)
                            COMPREPLY=( \$(compgen -W "\${notification_type_options}" -- "\${cur}") )
                            return 0
                            ;;
                        *)
                            COMPREPLY=( \$(compgen -W "--json --read --type --since --before --help" -- "\${cur}") )
                            return 0
                            ;;
                    esac
                    ;;
                mark-read)
                    COMPREPLY=( \$(compgen -W "--json --help" -- "\${cur}") )
                    return 0
                    ;;
                info)
                    if [[ "\${cword}" -eq 3 ]]; then
                        COMPREPLY=( \$(compgen -W "\${repo_info_commands}" -- "\${cur}") )
                    else
                        COMPREPLY=( \$(compgen -W "-R --repo --help" -- "\${cur}") )
                    fi
                    return 0
                    ;;
            esac
            ;;
    esac

    # Default to file completion
    COMPREPLY=( \$(compgen -f -- "\${cur}") )
    return 0
}

complete -F _gitcode_completions gitcode
###-end-gitcode-completions-###
`.trim();
