import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

interface CreatePrCommentOptions {
  body?: string;
  bodyFile?: string;
  editor?: boolean;
  web?: boolean;
  json?: boolean;
  repo?: string;
}

// 获取默认编辑器
function getDefaultEditor(): string {
  return process.env.EDITOR || process.env.VISUAL || 'nano';
}

// 在编辑器中打开内容
// TODO 移除编辑评论内容的功能和调用编辑器的功能
async function openEditor(content: string): Promise<string> {
  const editor = getDefaultEditor();
  const tempFile = path.join(process.cwd(), '.gitany-pr-comment-temp.md');

  try {
    fs.writeFileSync(tempFile, content);
    execSync(`${editor} "${tempFile}"`, { stdio: 'inherit' });
    const result = fs.readFileSync(tempFile, 'utf-8');
    fs.unlinkSync(tempFile);
    return result.trim();
  } catch (error) {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    throw new Error(`Failed to open editor: ${error}`);
  }
}

export async function createPrCommentAction(
  prNumber: string,
  body: string,
  options: CreatePrCommentOptions = {},
) {
  let repoUrl = '';
  await withClient(async (client) => {
    repoUrl = await resolveRepoUrl(options.repo);

    // 解析仓库URL获取 owner/repo（复用通用解析器）
    const parsed = parseGitUrl(repoUrl);
    if (!parsed) {
      throw new Error('Unrecognized repository URL. Provide a full git URL or run inside a git repo.');
    }

    const owner = parsed.owner;
    const repo = parsed.repo;
    const host = parsed.host || 'gitcode.com';
    const prNum = parseInt(prNumber, 10);

    if (isNaN(prNum)) {
      throw new Error('Invalid PR number');
    }

    // 如果指定了 web 模式，打开浏览器
    // TODO 移除web模式及相关代码
    if (options.web) {
      const url = `https://${host}/${owner}/${repo}/pull/${prNum}#new_comment_field`;
      const openMsg = `Opening ${url} in your browser...`;
      console.log(openMsg);
      logger.info({ url }, openMsg);
      return;
    }

    const comment = await client.pr.createComment(repoUrl, prNum, body);

    if (options.json) {
      console.log(JSON.stringify(comment, null, 2));
    } else {
      // GitHub CLI 风格的彩色输出
      const successMsg = '\n💬 PR comment created successfully!';
      console.log(successMsg);
      logger.info({ prNumber: prNum, repoUrl, commentId: comment.id }, 'PR comment created successfully');

      const detailsMsg = '\n📋 Comment Details:';
      console.log(detailsMsg);
      const idLine = `   ID:       ${comment.id}`;
      console.log(idLine);

      // 显示评论内容预览
      const bodyPreview = comment.body.length > 100
        ? comment.body.substring(0, 100) + '...'
        : comment.body;
      const previewLine = `   Preview:  "${bodyPreview}"`;
      console.log(previewLine);
      logger.info({ preview: bodyPreview }, previewLine);

      const nextStepsMsg = '\n💡 Next steps:';
      const replyLine = `   • Reply to comment:  gitcode pr comment ${prNumber} --body "Your reply"`;
      console.log(nextStepsMsg);
      console.log(replyLine);
      logger.info({ nextSteps: ['reply-to-comment'] }, 'Displayed next steps for PR comment');
    }
  }, (error) => {
    const prNum = Number.parseInt(prNumber, 10);
    const debugInfo = {
      repoUrl,
      prNumber: Number.isNaN(prNum) ? prNumber : prNum,
      hasBody: Boolean(body && body.trim()),
      bodyLength: body?.length ?? 0,
      options,
      error,
    };
    logger.error({ error, context: debugInfo }, 'Failed to create PR comment');
    return 'Failed to create PR comment';
  });
}

export function createPrCommentCommand(): Command {
  return new Command('comment')
    .description('Create a comment on a pull request')
    .argument('<pr-number>', 'Pull request number')
    .argument('[url]', 'Repository URL or identifier')
    .option('--body <string>', 'Supply a comment body')
    .option('-F, --body-file <file>', 'Read body text from file (use "-" to read from standard input)')
    .option('-e, --editor', 'Open text editor to write the comment')
    .option('-w, --web', 'Open the browser to create a comment')
    .option('--json', 'Output raw JSON instead of formatted output')
    .option('-R, --repo <[HOST/]OWNER/REPO>', 'Select another repository using the [HOST/]OWNER/REPO format')
    .action(async (
      prNumber: string,
      repoUrlArg: string | undefined,
      options: CreatePrCommentOptions,
    ) => {
      const repoArg = repoUrlArg?.trim() || undefined;
      const repoOption = options.repo?.trim() || undefined;

      if (repoArg && repoOption && repoArg !== repoOption) {
        throw new Error('Repository specified twice. Use either positional [url] or --repo.');
      }

      const resolvedOptions: CreatePrCommentOptions = {
        ...options,
        repo: repoArg ?? repoOption,
      };

      // 获取评论内容
      let finalBody = resolvedOptions.body || '';

      if (resolvedOptions.bodyFile) {
        if (resolvedOptions.bodyFile === '-') {
          finalBody = fs.readFileSync(0, 'utf-8').trim();
        } else {
          if (!fs.existsSync(resolvedOptions.bodyFile)) {
            throw new Error(`File not found: ${resolvedOptions.bodyFile}`);
          }
          finalBody = fs.readFileSync(resolvedOptions.bodyFile, 'utf-8').trim();
        }
      } else if (resolvedOptions.editor) {
        const template = `# Comment on Pull Request #${prNumber}

<!-- Write your comment below -->`;
        finalBody = await openEditor(template);
      } else if (!finalBody) {
        const promptMsg = 'Enter comment body (press Ctrl+D when finished, or use -e/--editor):';
        console.log(promptMsg);
        logger.info(promptMsg);
        finalBody = fs.readFileSync(0, 'utf-8').trim();
      }

      if (!finalBody) {
        throw new Error('Comment body is required');
      }

      await createPrCommentAction(prNumber, finalBody, resolvedOptions);
    });
}
