import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { formatAssignees } from './helpers';
import type { IssueComment, IssueDetail } from '@gitany/gitcode';
import { isObjectLike } from '@gitany/gitcode';
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

      const issue: IssueDetail = await client.issue.get(repoUrl, issueNumber);
      let comments: IssueComment[] | undefined;

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
      console.log(`   State: ${colorizeState(String(issue.state ?? 'unknown'))}`);

      const issueUrl = issue.html_url;
      if (issueUrl) {
        console.log(`   URL: ${colors.blue}${issueUrl}${colors.reset}`);
      }

      const author = formatUserName(issue.user);
      console.log(`   Author: ${author}`);

      if (issue.created_at) {
        const createdDate = new Date(issue.created_at);
        console.log(`   Created: ${createdDate.toLocaleString()}`);
      }

      if (issue.updated_at) {
        const updatedDate = new Date(issue.updated_at);
        console.log(`   Updated: ${updatedDate.toLocaleString()}`);
      }

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

      const milestone = (issue as { milestone?: unknown }).milestone;
      if (isObjectLike(milestone)) {
        const mTitle = Reflect.get(milestone, 'title');
        const mName = Reflect.get(milestone, 'name');
        const mId = Reflect.get(milestone, 'id');
        const display =
          (typeof mTitle === 'string' && mTitle) ||
          (typeof mName === 'string' && mName) ||
          (typeof mId === 'string' && mId) ||
          (typeof mId === 'number' && String(mId)) ||
          '';
        console.log(`   Milestone: ${display}`);
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
            const id = comment.comment_id ?? comment.id ?? '?';
            const user = formatUserName(comment.user);
            const bodyText = (comment.body ?? '').split('\n')[0];
            const created = comment.created_at ? new Date(comment.created_at).toLocaleString() : undefined;
            const metaParts = [user];
            if (created) {
              metaParts.push(created);
            }
            console.log(
              `   • [#${id}] ${metaParts.join(' · ')}${bodyText ? ` — ${bodyText}` : ''}`,
            );
          });
        } else {
          console.log('   (no comments)');
        }
      }
    },
    'Failed to view issue',
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

export function viewCommand(): Command {
  return new Command('view')
    .description('View issue details')
    .argument('<number>', 'Issue number')
    .argument('[url]', 'Repository URL')
    .option('--comments', 'Include issue comments in the output')
    .option('--page <n>', 'Page number when fetching comments')
    .option('--per-page <n>', 'Items per page when fetching comments')
    .option('--json', 'Output raw JSON instead of formatted text')
    .option(
      '-R, --repo <[HOST/]OWNER/REPO>',
      'Select another repository using the [HOST/]OWNER/REPO format',
    )
    .action(viewAction);
}
