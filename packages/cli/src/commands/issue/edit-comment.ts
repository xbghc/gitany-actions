import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('cli:issue:edit-comment');

interface EditCommentOptions {
  body?: string;
  bodyFile?: string;
  json?: boolean;
  repo?: string;
}

export async function editCommentAction(
  commentIdArg: string,
  options: EditCommentOptions = {},
) {
  await withClient(async (client) => {
    if (!options.repo) {
      throw new Error('The --repo flag is required when editing a comment.');
    }

    const parsedRepo = parseGitUrl(options.repo);
    if (!parsedRepo) {
      throw new Error(`Invalid repository format: "${options.repo}". Use OWNER/REPO or a full URL.`);
    }
    const { owner, repo } = parsedRepo;

    const comment_id = parseInt(commentIdArg, 10);
    if (isNaN(comment_id)) {
      throw new Error(`Invalid comment ID: "${commentIdArg}". Must be a number.`);
    }

    let finalBody = options.body || '';
    if (options.bodyFile) {
      if (!fs.existsSync(options.bodyFile)) {
        throw new Error(`File not found: ${options.bodyFile}`);
      }
      finalBody = fs.readFileSync(options.bodyFile, 'utf-8').trim();
    }

    if (!finalBody) {
      throw new Error('Comment body is required. Use --body or --body-file.');
    }

    logger.debug({ owner, repo, comment_id }, 'Updating comment');

    try {
      const comment = await client.issue.updateComment({
        owner,
        repo,
        comment_id,
        body: { body: finalBody },
      });

      if (options.json) {
        console.log(JSON.stringify(comment, null, 2));
      } else {
        console.log(`✅ Comment ${comment.id} updated successfully.`);
      }
    } catch {
      throw new Error(
        `Failed to update comment ${comment_id} in ${owner}/${repo}.`,
      );
    }
  }, 'Failed to edit comment');
}

export function editCommentCommand(): Command {
  return new Command('edit-comment')
    .description('Edit a comment on an issue')
    .argument('<comment-id>', 'The ID of the comment to edit')
    .option('-b, --body <string>', 'New comment body')
    .option('-F, --body-file <file>', 'Read new body text from a file')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository (required)')
    .option('--json', 'Output raw JSON')
    .action(editCommentAction);
}
