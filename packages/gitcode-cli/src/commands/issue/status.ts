import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

interface StatusOptions {
  json?: boolean;
}

export async function statusAction(urlArg?: string, options: StatusOptions = {}) {
  await withClient(async (client) => {
    const resolved = await resolveRepoUrl(urlArg);
    let owner = resolved.owner;
    let repo = resolved.repo;

    if (!owner || !repo) {
      const parsed = parseGitUrl(resolved.repoUrl);
      if (!parsed) {
        throw new Error('Unrecognized repository URL. Provide OWNER/REPO or a full git URL.');
      }
      owner = parsed.owner;
      repo = parsed.repo;
    }

    // 获取 issues 统计信息
    const repoUrl = resolved.repoUrl;
    const [openIssues, closedIssues, recentIssues] = await Promise.all([
      client.issue.list(repoUrl, { state: 'open', per_page: 100 }),
      client.issue.list(repoUrl, { state: 'closed', per_page: 100 }),
      client.issue.list(repoUrl, { state: 'open', per_page: 5 }),
    ]);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            repository: `${owner}/${repo}`,
            open_issues: openIssues.length,
            closed_issues: closedIssues.length,
            recent_issues: recentIssues.slice(0, 5),
          },
          null,
          2,
        ),
      );
    } else {
      // GitHub CLI 风格的彩色输出
      const colors = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        cyan: '\x1b[36m',
        bright: '\x1b[1m',
      };

      console.log(`\n📊 Issue Status for ${colors.cyan}${owner}/${repo}${colors.reset}`);
      console.log('─'.repeat(50));

      const openCount = openIssues.length;
      const closedCount = closedIssues.length;
      const totalCount = openCount + closedCount;

      console.log(`\n📈 Overview:`);
      console.log(`   Total issues:    ${colors.bright}${totalCount}${colors.reset}`);
      console.log(`   Open issues:     ${colors.green}${openCount}${colors.reset}`);
      console.log(`   Closed issues:   ${colors.red}${closedCount}${colors.reset}`);

      if (totalCount > 0) {
        const openPercentage = Math.round((openCount / totalCount) * 100);
        const closedPercentage = Math.round((closedCount / totalCount) * 100);

        console.log(`\n📊 Distribution:`);
        console.log(
          `   Open:   ${'█'.repeat(Math.floor(openPercentage / 5))}${'░'.repeat(20 - Math.floor(openPercentage / 5))} ${openPercentage}%`,
        );
        console.log(
          `   Closed: ${'█'.repeat(Math.floor(closedPercentage / 5))}${'░'.repeat(20 - Math.floor(closedPercentage / 5))} ${closedPercentage}%`,
        );
      }

      if (recentIssues.length > 0) {
        console.log(`\n🔥 Recent Open Issues:`);
        recentIssues.slice(0, 5).forEach((issue, index) => {
          console.log(
            `   ${index + 1}. ${colors.blue}#${issue.number}${colors.reset} ${issue.title}`,
          );
        });
      }

      console.log(`\n💡 Quick Actions:`);
      console.log(`   • Create new issue:  gitcode issue create ${owner}/${repo} "Title"`);
      console.log(`   • List all issues:   gitcode issue list ${owner}/${repo}`);
      console.log(
        `   • View repository:   ${colors.blue}https://gitcode.com/${owner}/${repo}${colors.reset}`,
      );
    }
  }, 'Failed to get issue status');
}

export function statusCommand(): Command {
  return new Command('status')
    .alias('st')
    .description('Show issue status and statistics for a repository')
    .argument('[url]', 'Repository URL or OWNER/REPO')
    .option('--json', 'Output raw JSON instead of formatted status')
    .action(statusAction);
}
