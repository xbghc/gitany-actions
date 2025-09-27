import { type Issue, type IssueComment, parseGitUrl } from '@gitany/gitcode';
import type { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('ai-mentions');

export async function watchAiMentions(
  client: GitcodeClient,
  repoUrl: string,
  issueNumber: number,
) {
  const { owner, repo } = parseGitUrl(repoUrl) ?? {};
  if (!owner || !repo) {
    throw new Error(`Could not parse owner and repo from URL: ${repoUrl}`);
  }

  let issueDetail: Issue | undefined;
  let issueComments: IssueComment[] | undefined;

  try {
    issueDetail = await client.issues.get({ owner, repo, issueNumber });
  } catch (err) {
    logger.error(`Failed to get issue detail: ${(err as Error).message}`);
  }

  if (!issueDetail) {
    return;
  }

  try {
    issueComments = await client.issues.listComments({
      owner,
      repo,
      issueNumber,
    });
  } catch (err) {
    logger.error(`Failed to get issue comments: ${(err as Error).message}`);
  }

  if (issueComments) {
    // await handleAiMentions(client, repoUrl, issueDetail, issueComments);
    logger.info('AI mentions handling is currently disabled.');
  }
}
