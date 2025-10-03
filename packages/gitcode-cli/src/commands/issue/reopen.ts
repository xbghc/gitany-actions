import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { colorizeState, colors, resolveIssueContext, type RepoOption } from './helpers';

interface ReopenOptions extends RepoOption {
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

      const issue = await client.issue.update(repoUrl, issueNumber, { state: 'open' });

      if (options.json) {
        console.log(JSON.stringify(issue, null, 2));
        return;
      }

      console.log(`\n🔓 Issue #${issue.number} reopened.`);
      console.log(`   State: ${colorizeState(issue.state)}`);
      console.log(`   URL: ${colors.blue}${issue.html_url}${colors.reset}`);
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
