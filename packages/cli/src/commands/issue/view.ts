import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import {
  colors,
  colorizeState,
  formatUserName,
  resolveIssueContext,
  type IssueTargetOptions,
} from './helpers';

interface ViewOptions extends IssueTargetOptions {
  comments?: boolean;
  page?: string;
  perPage?: string;
  json?: boolean;
}

export async function viewAction(
  issueNumberArg: string,
  urlArg?: string,
  options: ViewOptions = {},
) {
  await withClient(
    async (client) => {
      const { issueNumber, repoUrl } = await resolveIssueContext(issueNumberArg, urlArg, options);

      try {
        const issue = await client.issue.get(repoUrl, issueNumber);
        let comments: unknown[] | undefined;

        if (options.comments) {
          comments = await client.issue.comments(repoUrl, issueNumber, {
            page: options.page ? Number(options.page) : undefined,
            per_page: options.perPage ? Number(options.perPage) : undefined,
          });
        }

        if (options.json) {
          const payload = options.comments ? { issue, comments } : issue;
          console.log(JSON.stringify(payload ?? null, null, 2));
          return;
        }

        console.log(`\n🪪 Issue #${issue.number}: ${issue.title}`);
        console.log(`   State: ${colorizeState(String((issue as { state?: string }).state ?? 'unknown'))}`);

        const issueUrl = (issue as { html_url?: string }).html_url;
        if (issueUrl) {
          console.log(`   URL: ${colors.blue}${issueUrl}${colors.reset}`);
        }

        const author = formatUserName((issue as { user?: unknown }).user);
        console.log(`   Author: ${author}`);

        const createdAt = (issue as { created_at?: string }).created_at;
        if (createdAt) {
          const createdDate = new Date(createdAt);
          console.log(`   Created: ${createdDate.toLocaleString()}`);
        }

        const updatedAt = (issue as { updated_at?: string }).updated_at;
        if (updatedAt) {
          const updatedDate = new Date(updatedAt);
          console.log(`   Updated: ${updatedDate.toLocaleString()}`);
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

        const milestone = (issue as { milestone?: unknown }).milestone;
        if (milestone && typeof milestone === 'object' && milestone !== null) {
          const record = milestone as Record<string, unknown>;
          console.log(`   Milestone: ${String(record.title ?? record.name ?? record.id ?? '')}`);
        }

        const body = (issue as { body?: string | null }).body;
        if (body) {
          console.log('\n📝 Body:\n');
          console.log(body);
        }

        if (options.comments) {
          console.log('\n💬 Comments:');
          if (comments && comments.length > 0) {
            comments.forEach((comment) => {
              const item = comment as Record<string, unknown>;
              const id = item.id ?? item.comment_id ?? '?';
              const user = formatUserName(item.user);
              const bodyText = String(item.body ?? '').split('\n')[0];
              const created = typeof item.created_at === 'string'
                ? new Date(String(item.created_at)).toLocaleString()
                : undefined;
              const metaParts = [user];
              if (created) {
                metaParts.push(created);
              }
              console.log(`   • [#${id}] ${metaParts.join(' · ')}${bodyText ? ` — ${bodyText}` : ''}`);
            });
          } else {
            console.log('   (no comments)');
          }
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
    'Failed to view issue',
  );
}

export function viewCommand(): Command {
  return new Command('view')
    .description('View issue details')
    .argument('<number>', 'Issue number')
    .argument('[url]', 'Repository URL')
    .option('--comments', 'Include issue comments in the output')
    .option('--page <n>', 'Page number when fetching comments')
    .option('--per-page <n>', 'Items per page when fetching comments')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option('-R, --repo <[HOST/]OWNER/REPO>', 'Select another repository using the [HOST/]OWNER/REPO format')
    .action(viewAction);
}

