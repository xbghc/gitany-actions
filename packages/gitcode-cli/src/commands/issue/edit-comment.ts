import { parseGitUrl } from '@xbghc/gitcode-api';
import { Command } from 'commander';
import * as fs from 'fs';
import { resolveGitCodeRepoUrl } from '../../utils/resolve-repo-url.js';
import { withClient } from '../../utils/with-client.js';

interface EditCommentOptions {
  body?: string;
  bodyFile?: string;
  json?: boolean;
  repo?: string;
}

export async function editCommentAction(commentIdArg: string, options: EditCommentOptions = {}) {
  await withClient(async (client) => {
    let owner: string | undefined;
    let repo: string | undefined;

    if (options.repo) {
      const parsedRepo = parseGitUrl(options.repo);
      if (!parsedRepo) {
        throw new Error(
          `Invalid repository format: "${options.repo}". Use OWNER/REPO or a full URL.`,
        );
      }
      owner = parsedRepo.owner;
      repo = parsedRepo.repo;
    } else {
      // 自动检测仓库（从 git remote origin 获取）
      const repoUrl = await resolveGitCodeRepoUrl();
      const parsed = parseGitUrl(repoUrl);
      if (parsed) {
        owner = parsed.owner;
        repo = parsed.repo;
      }
    }

    if (!owner || !repo) {
      throw new Error('无法检测仓库信息，请在 git 仓库目录下运行或使用 --repo OWNER/REPO 指定');
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

    const comment = await client.issue.updateComment({
      owner,
      repo,
      id: comment_id,
      body: { body: finalBody },
    });

    if (options.json) {
      console.log(JSON.stringify(comment, null, 2));
    } else {
      console.log(`✅ Comment ${comment_id} updated successfully.`);
    }
  }, 'Failed to edit comment');
}

export function editCommentCommand(): Command {
  return new Command('edit-comment')
    .description('Edit a comment on an issue')
    .argument('<comment-id>', 'The ID of the comment to edit')
    .option('-b, --body <string>', 'New comment body')
    .option('-F, --body-file <file>', 'Read new body text from a file')
    .option('-R, --repo <OWNER/REPO>', 'Specify the repository (auto-detected if in a git repo)')
    .option('--json', 'Output raw JSON')
    .action(editCommentAction);
}
