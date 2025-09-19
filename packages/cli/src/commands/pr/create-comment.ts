import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';

interface CreateCommentOptions {
  body?: string;
  bodyFile?: string;
  json?: boolean;
  repo?: string;
}

export async function createCommentAction(
  prNumberArg: string,
  bodyArg?: string,
  options: CreateCommentOptions = {},
) {
  await withClient(async (client) => {
    if (!options.repo) {
      throw new Error('The --repo flag is required when creating a PR comment.');
    }
    const { owner, repo } = parseGitUrl(options.repo) ?? {};
    if (!owner || !repo) {
      throw new Error(`Invalid repository format: "${options.repo}". Use OWNER/REPO or a full URL.`);
    }

    const prNumber = parseInt(prNumberArg, 10);
    if (isNaN(prNumber)) {
      throw new Error(`Invalid PR number: "${prNumberArg}". Must be a number.`);
    }

    let finalBody = bodyArg || options.body || '';

    if (options.bodyFile) {
      if (!fs.existsSync(options.bodyFile)) {
        throw new Error(`File not found: ${options.bodyFile}`);
      }
      finalBody = fs.readFileSync(options.bodyFile, 'utf-8').trim();
    }

    if (!finalBody) {
      throw new Error('Comment body is required. Use the body argument, --body, or --body-file.');
    }

    const comment = await client.pulls.createComment({
      owner,
      repo,
      number: prNumber,
      body: { body: finalBody },
    });

    if (options.json) {
      console.log(JSON.stringify(comment, null, 2));
    } else {
      console.log(`✅ Comment ${comment.id} created successfully on PR #${prNumber}.`);
    }
  }, 'Failed to create PR comment');
}

export function createCommentCommand(): Command {
  return new Command('create-comment')
    .description('Create a comment on a pull request')
    .argument('<pr-number>', 'The number of the pull request')
    .argument('[body]', 'Comment body (required unless using --body or --body-file)')
    .option('-b, --body <string>', 'Supply a comment body')
    .option('-F, --body-file <file>', 'Read body text from a file')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository (required)')
    .option('--json', 'Output raw JSON')
    .action(createCommentAction);
}
