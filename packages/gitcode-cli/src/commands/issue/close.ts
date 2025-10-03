import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { colorizeState, colors, resolveIssueContext, type RepoOption } from './helpers';

interface CloseOptions extends RepoOption {
  json?: boolean;
}

export async function closeAction(
  issueNumberArg: string,
  urlArg?: string,
  options: CloseOptions = {},
) {
  await withClient(
    async (client) => {
      const { issueNumber, repoUrl } = await resolveIssueContext(issueNumberArg, urlArg, options);

      const issue = await client.issue.update(repoUrl, issueNumber, { state: 'closed' });

      if (options.json) {
        console.log(JSON.stringify(issue, null, 2));
        return;
      }

      console.log(`\n🔒 Issue #${issue.number} closed.`);
      console.log(`   State: ${colorizeState(String(issue.state ?? 'closed'))}`);

      console.log(`   URL: ${colors.blue}${issue.html_url}${colors.reset}`);

      console.log(`\n💡 Reopen the issue anytime with: gitcode issue reopen ${issue.number}`);
    },
    'Failed to close issue',
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

export function closeCommand(): Command {
  return new Command('close')
    .description('Close an issue')
    .argument('<number>', 'Issue number')
    .argument('[url]', 'Repository URL')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option(
      '-R, --repo <[HOST/]OWNER/REPO>',
      'Select another repository using the [HOST/]OWNER/REPO format',
    )
    .action(closeAction);
}
