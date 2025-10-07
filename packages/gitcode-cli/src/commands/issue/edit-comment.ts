import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import { resolveRepoUrl } from '@gitany/git-lib';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('cli:issue:edit-comment');

interface EditCommentOptions {
  body?: string;
  bodyFile?: string;
  json?: boolean;
}

export async function editCommentAction(
  commentIdArg: string,
  urlArg?: string,
  options: EditCommentOptions = {},
) {
  await withClient(async (client) => {
    const resolved = await resolveRepoUrl(urlArg);
    let owner = resolved.owner;
    let repo = resolved.repo;

    if (!owner || !repo) {
      const parsedRepo = parseGitUrl(resolved.repoUrl);
      if (!parsedRepo) {
        throw new Error(
          'Unrecognized repository URL. Provide OWNER/REPO or a full git URL.',
        );
      }
      owner = parsedRepo.owner;
      repo = parsedRepo.repo;
    }

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
  }, 'Failed to edit comment');
}

export function editCommentCommand(): Command {
  return new Command('edit-comment')
    .description('Edit a comment on an issue')
    .argument('<comment-id>', 'The ID of the comment to edit')
    .argument('[url]', 'Repository URL or OWNER/REPO')
    .option('-b, --body <string>', 'New comment body')
    .option('-F, --body-file <file>', 'Read new body text from a file')
    .option('--json', 'Output raw JSON')
    .action(editCommentAction);
}
