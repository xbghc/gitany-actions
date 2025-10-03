import type { UpdateIssueBody, UpdatedIssue } from '@gitany/gitcode';
import { Command } from 'commander';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';
import {
  colorizeState,
  colors,
  formatAssignees,
  resolveIssueContext,
  type RepoOption,
} from './helpers';

interface EditOptions extends RepoOption {
  title?: string;
  body?: string;
  bodyFile?: string;
  label?: string[];
  assignee?: string;
  milestone?: number;
  state?: string;
  json?: boolean;
}

function readBodyFromFile(path: string): string {
  if (path === '-') {
    return fs.readFileSync(0, 'utf-8');
  }
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  return fs.readFileSync(path, 'utf-8');
}

export async function editAction(
  issueNumberArg: string,
  urlArg?: string,
  options: EditOptions = {},
) {
  await withClient(
    async (client) => {
      const { issueNumber, repoUrl } = await resolveIssueContext(issueNumberArg, urlArg, options);

      let finalBody = options.body;
      if (options.bodyFile) {
        finalBody = readBodyFromFile(options.bodyFile).trim();
      }

      const normalizedState = options.state?.toLowerCase();
      if (normalizedState && normalizedState !== 'open' && normalizedState !== 'closed') {
        throw new Error('State must be either "open" or "closed"');
      }
      const state = normalizedState as 'open' | 'closed' | undefined;

      const updateBody: UpdateIssueBody = {};
      if (options.title !== undefined) {
        updateBody.title = options.title;
      }
      if (finalBody !== undefined) {
        updateBody.body = finalBody;
      }
      if (options.label && options.label.length > 0) {
        updateBody.labels = options.label;
      }
      if (options.assignee !== undefined) {
        updateBody.assignee = options.assignee;
      }
      if (options.milestone !== undefined) {
        updateBody.milestone = options.milestone;
      }
      if (state) {
        updateBody.state = state;
      }

      if (Object.keys(updateBody).length === 0) {
        throw new Error(
          'No changes specified. Use options like --title, --body, --label, --assignee, or --state.',
        );
      }

      const issue: UpdatedIssue = await client.issue.update(repoUrl, issueNumber, updateBody);

      if (options.json) {
        console.log(JSON.stringify(issue, null, 2));
        return;
      }

      console.log(`\n✅ Issue #${issue.number} updated successfully.`);
      console.log(`   Title: ${issue.title}`);
      console.log(`   State: ${colorizeState(issue.state)}`);
      console.log(`   URL: ${colors.blue}${issue.html_url}${colors.reset}`);

      if (issue.labels.length > 0) {
        const labelNames = issue.labels
          .map((label) => {
            if (label.name) return label.name;
            if (label.title) return label.title;
            if (typeof label.id === 'string' && label.id) return label.id;
            if (typeof label.id === 'number') return String(label.id);
            return '';
          })
          .filter(Boolean)
          .join(', ');
        if (labelNames) {
          console.log(`   Labels: ${labelNames}`);
        }
      }

      const assigneesText = formatAssignees(issue.assignees);
      if (assigneesText) {
        console.log(`   Assignees: ${assigneesText}`);
      }

      if (state) {
        console.log(
          `\nℹ️  You can reopen or close the issue anytime using: gitcode issue ${state === 'open' ? 'close' : 'reopen'} ${issue.number}`,
        );
      }
    },
    'Failed to edit issue',
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

export function editCommand(): Command {
  return new Command('edit')
    .description('Edit an existing issue')
    .argument('<number>', 'Issue number')
    .argument('[url]', 'Repository URL')
    .option('-t, --title <string>', 'Update the issue title')
    .option('-b, --body <string>', 'Update the issue body text')
    .option('-F, --body-file <file>', 'Read issue body text from a file (use "-" for stdin)')
    .option(
      '-l, --label <name>',
      'Replace labels (can be used multiple times)',
      (value: string, previous: string[] = []) => previous.concat(value),
    )
    .option('-a, --assignee <login>', 'Set the assignee login')
    .option('-m, --milestone <number>', 'Set milestone by number', (value: string) =>
      parseInt(value, 10),
    )
    .option('--state <state>', 'Update issue state: open | closed')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option(
      '-R, --repo <[HOST/]OWNER/REPO>',
      'Select another repository using the [HOST/]OWNER/REPO format',
    )
    .action(editAction);
}
