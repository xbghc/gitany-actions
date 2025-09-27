import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { colors, colorizeState, resolveIssueContext, type IssueTargetOptions } from './helpers';
import { parseGitUrl } from '@gitany/gitcode';

interface ReopenOptions extends IssueTargetOptions {
  json?: boolean;
}

export async function reopenAction(
  issueNumberArg: string,
  urlArg?: string,
  options: ReopenOptions = {},
) {
  await withClient(
    async (client) => {
      const { issueNumber, repoUrl } = await resolveIssueContext(issueNumberArg, urlArg, options);
      const { owner, repo } = parseGitUrl(repoUrl) ?? {};
      if (!owner || !repo) {
        throw new Error(`Could not parse owner and repo from URL: ${repoUrl}`);
      }

      const issue = await client.issues.update({
        owner,
        repo,
        issueNumber,
        body: { state: 'open' },
      });

      if (options.json) {
        console.log(JSON.stringify(issue, null, 2));
        return;
      }

      console.log(`\n🔓 Issue #${issue.number} reopened.`);
      console.log(
        `   State: ${colorizeState(String((issue as { state?: string }).state ?? 'open'))}`,
      );
      const issueUrl = (issue as { html_url?: string }).html_url;
      if (issueUrl) {
        console.log(`   URL: ${colors.blue}${issueUrl}${colors.reset}`);
      }
      console.log(`\n💡 Close the issue again with: gitcode issue close ${issue.number}`);
    },
    'Failed to reopen issue',
    {
      onNotFound: () => {
        if (options.json) {
          console.log('null');
        } else {
          console.log('Issue not found.');
        }
      },
    },
  );
}

export function reopenCommand(): Command {
  return new Command('reopen')
    .description('Reopen a closed issue')
    .argument('<number>', 'Issue number')
    .argument('[url]', 'Repository URL')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option(
      '-R, --repo <[HOST/]OWNER/REPO>',
      'Select another repository using the [HOST/]OWNER/REPO format',
    )
    .action(reopenAction);
}
