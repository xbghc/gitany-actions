import { Command } from 'commander';
import { resolveRepoUrl } from '@gitany/git-lib';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';

interface CreateCommentOptions {
  body?: string;
  bodyFile?: string;
  json?: boolean;
}

export async function createCommentAction(
  issueArg: string,
  bodyArg?: string,
  options: CreateCommentOptions = {},
) {
  await withClient(async (client) => {
    const resolved = await resolveRepoUrl(issueArg);
    const issueResource = resolved.resource;
    if (!resolved.owner || !resolved.repo || issueResource?.type !== 'issue') {
      throw new Error(
        'Invalid issue format. Use OWNER/REPO/NUMBER or https://gitcode.com/OWNER/REPO/issues/NUMBER',
      );
    }

    const owner = resolved.owner;
    const repo = resolved.repo;
    const issueNumber = issueResource.number;

    let finalBody = bodyArg || options.body || '';

    if (options.bodyFile) {
      if (!fs.existsSync(options.bodyFile)) {
        throw new Error(`File not found: ${options.bodyFile}`);
      }
      const stats = fs.statSync(options.bodyFile);
      if (stats.isDirectory()) {
        throw new Error(`Cannot read body from a directory: ${options.bodyFile}`);
      }
      if (stats.size === 0) {
        throw new Error(`File is empty: ${options.bodyFile}`);
      }
      if (stats.size > 65536) {
        // 64KB 限制
        throw new Error(`File is too large: ${options.bodyFile}`);
      }
      finalBody = fs.readFileSync(options.bodyFile, 'utf-8').trim();
    }

    if (!finalBody) {
      throw new Error('Comment body is required. Use the body argument, --body, or --body-file.');
    }

    const comment = await client.issue.createComment({
      owner,
      repo,
      number: issueNumber,
      body: { body: finalBody },
    });

    if (options.json) {
      console.log(JSON.stringify(comment, null, 2));
    } else {
      // GitHub CLI 风格的彩色输出
      console.log('\n💬 Comment created successfully!');
      console.log('\n📋 Comment Details:');
      console.log(`   ID:       ${comment.id}`);
      const bodyPreview =
        comment.body.length > 100 ? comment.body.substring(0, 100) + '...' : comment.body;
      console.log(`   Preview:  "${bodyPreview}"`);

      console.log(`\n💡 Next steps:`);
      console.log(
        `   • Reply to comment:  gitcode issue comment ${issueNumber} --body "Your reply"`,
      );
    }
  }, 'Failed to create comment');
}

export function createCommentCommand(): Command {
  return new Command('comment')
    .description('Create a comment on an issue')
    .argument('<issue>', 'Issue URL, number, or OWNER/REPO/NUMBER')
    .argument('[body]', 'Comment body (required unless using --body or --body-file)')
    .option('-b, --body <string>', 'Supply a comment body')
    .option('-F, --body-file <file>', 'Read body text from a file')
    .option('--json', 'Output raw JSON instead of formatted output')
    .action(createCommentAction);
}
