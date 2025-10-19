import { Command } from 'commander';
import { parseGitUrl } from '@xbghc/gitcode-api';
import * as fs from 'fs';
import { withClient } from '../../utils/with-client';

interface CreateCommentOptions {
  body?: string;
  bodyFile?: string;
  json?: boolean;
  repo?: string;
}

export async function createCommentAction(
  issueArg: string,
  bodyArg?: string,
  options: CreateCommentOptions = {},
) {
  await withClient(async (client) => {
    // 处理 --repo 标志和解析 issue 参数
    let owner: string;
    let repo: string;
    let issueNumber: number;

    if (options.repo) {
      const parsed = parseGitUrl(options.repo);
      if (parsed) {
        owner = parsed.owner;
        repo = parsed.repo;
      } else {
        const parts = options.repo.split('/');
        if (parts.length === 3) {
          owner = parts[1];
          repo = parts[2];
        } else if (parts.length === 2) {
          owner = parts[0];
          repo = parts[1];
        } else {
          throw new Error(`Invalid repository format: "${options.repo}". Use [HOST/]OWNER/REPO`);
        }
      }

      issueNumber = parseInt(issueArg, 10);
    } else {
      const urlMatch = issueArg.match(/^(?:https?:\/\/)?([^/]+)\/([^/]+)\/issues\/(\d+)$/);
      if (urlMatch) {
        owner = urlMatch[1];
        repo = urlMatch[2];
        issueNumber = parseInt(urlMatch[3], 10);
      } else {
        const parts = issueArg.split('/');
        if (parts.length === 3) {
          owner = parts[0];
          repo = parts[1];
          issueNumber = parseInt(parts[2], 10);
        } else {
          throw new Error(
            'Invalid issue format. Use OWNER/REPO/NUMBER or https://gitcode.com/OWNER/REPO/issues/NUMBER',
          );
        }
      }
    }

    if (isNaN(issueNumber)) {
      throw new Error('Invalid issue number');
    }

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
    .option(
      '-R, --repo <[HOST/]OWNER/REPO>',
      'Select another repository using the [HOST/]OWNER/REPO format',
    )
    .action(createCommentAction);
}
