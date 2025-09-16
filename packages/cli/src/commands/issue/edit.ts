import { Command } from 'commander';
import type { UpdateIssueBody } from '@gitany/gitcode';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';
import {
  colors,
  colorizeState,
  formatUserName,
  resolveIssueContext,
  type IssueTargetOptions,
} from './helpers';

interface EditOptions extends IssueTargetOptions {
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
      const state = normalizedState as ('open' | 'closed' | undefined);

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
        throw new Error('No changes specified. Use options like --title, --body, --label, --assignee, or --state.');
      }

      try {
        const issue = await client.issue.update(repoUrl, issueNumber, updateBody);

        if (options.json) {
          console.log(JSON.stringify(issue, null, 2));
          return;
        }

        console.log(`\n✅ Issue #${issue.number} updated successfully.`);
        console.log(`   Title: ${issue.title}`);
        console.log(`   State: ${colorizeState(String((issue as { state?: string }).state ?? 'unknown'))}`);
        const issueUrl = (issue as { html_url?: string }).html_url;
        if (issueUrl) {
          console.log(`   URL: ${colors.blue}${issueUrl}${colors.reset}`);
        }

        const labels = (issue as { labels?: unknown }).labels;
        if (Array.isArray(labels) && labels.length > 0) {
          const labelNames = labels
            .map((label) => {
              if (!label || typeof label !== 'object') {
                return String(label ?? '');
              }
              const record = label as Record<string, unknown>;
              return String(record.name ?? record.title ?? record.id ?? '');
            })
            .filter(Boolean)
            .join(', ');
          if (labelNames) {
            console.log(`   Labels: ${labelNames}`);
          }
        }

        const assignee = (issue as { assignee?: unknown }).assignee;
        if (assignee) {
          console.log(`   Assignee: ${formatUserName(assignee)}`);
        }

        if (state) {
          console.log(`\nℹ️  You can reopen or close the issue anytime using: gitcode issue ${state === 'open' ? 'close' : 'reopen'} ${issue.number}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/\b404\b/.test(message)) {
          if (options.json) {
            console.log('null');
          } else {
            console.log('Issue not found.');
          }
          return;
        }
        throw err;
      }
    },
    'Failed to edit issue',
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
    .option('-l, --label <name>', 'Replace labels (can be used multiple times)', (value: string, previous: string[] = []) => previous.concat(value))
    .option('-a, --assignee <login>', 'Set the assignee login')
    .option('-m, --milestone <number>', 'Set milestone by number', (value: string) => parseInt(value, 10))
    .option('--state <state>', 'Update issue state: open | closed')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option('-R, --repo <[HOST/]OWNER/REPO>', 'Select another repository using the [HOST/]OWNER/REPO format')
    .action(editAction);
}

