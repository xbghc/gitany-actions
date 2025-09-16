import type { PRComment, PullRequest } from '@gitany/gitcode';
import type { AiMentionContext } from './types';

export function defaultPromptBuilder(context: AiMentionContext): string {
  const { issue, issueComments, mentionComment, commentSource, repoUrl, pullRequest } = context;
  const lines: string[] = [];
  const isPrReviewComment = commentSource === 'pr_review_comment';

  lines.push('You are an AI assistant helping with GitCode issues and pull requests.');
  lines.push(`Repository: ${repoUrl}`);

  if (isPrReviewComment && pullRequest) {
    const title = pullRequest.title?.trim() || issue.title;
    lines.push(`Pull request #${pullRequest.number}: ${title}`);

    const prState = pullRequest.state?.trim();
    if (prState) {
      lines.push(`Pull request state: ${prState}`);
    }

    const baseBranch = formatBranchReference(pullRequest.base);
    const headBranch = formatBranchReference(pullRequest.head);
    if (baseBranch || headBranch) {
      const branchLines: string[] = [];
      if (baseBranch) branchLines.push(`Base branch: ${baseBranch}`);
      if (headBranch) branchLines.push(`Compare branch: ${headBranch}`);
      lines.push(branchLines.join('\n'));
    }

    const description = issue.body?.trim();
    if (description) {
      lines.push(`Pull request description:\n${description}`);
    } else {
      lines.push('Pull request description: (not provided)');
    }
  } else {
    lines.push(`Issue #${issue.number}: ${issue.title}`);

    const issueBody = issue.body?.trim();
    if (issueBody) {
      lines.push(`Issue description:\n${issueBody}`);
    } else {
      lines.push('Issue description: (not provided)');
    }
  }

  const history = issueComments
    .filter((c) => c.id !== mentionComment.id)
    .slice(-5)
    .map((c) => c.body.trim())
    .filter(Boolean);
  if (history.length) {
    lines.push(isPrReviewComment && pullRequest ? 'Recent pull request comments:' : 'Recent comments:');
    for (const entry of history) {
      lines.push(entry);
    }
  }

  if (isPrReviewComment && pullRequest) {
    const prComment = mentionComment as PRComment & { path?: string; diff_hunk?: string };
    const filePath = typeof prComment.path === 'string' ? prComment.path.trim() : '';
    const diffHunk = typeof prComment.diff_hunk === 'string' ? prComment.diff_hunk.trim() : '';
    if (filePath) {
      lines.push(`File: ${filePath}`);
    }
    if (diffHunk) {
      lines.push(`Code context:\n${diffHunk}`);
    }
  }

  lines.push(
    isPrReviewComment
      ? 'Pull request review comment mentioning @AI:'
      : 'Issue comment mentioning @AI:',
  );
  lines.push(mentionComment.body);
  lines.push('Provide a helpful answer or recommended next steps for the maintainers.');
  lines.push('Your entire reply must be written in Simplified Chinese.');

  return lines.join('\n\n');
}

function formatBranchReference(branch?: PullRequest['base']): string | undefined {
  if (!branch) return undefined;
  const label = typeof branch.label === 'string' ? branch.label.trim() : '';
  const ref = typeof branch.ref === 'string' ? branch.ref.trim() : '';
  if (label && ref && label !== ref) {
    return `${label} (${ref})`;
  }
  return label || ref || undefined;
}
