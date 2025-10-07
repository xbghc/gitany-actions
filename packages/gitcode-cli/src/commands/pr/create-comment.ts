import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@xbghc/gitcode-cli');

interface CreatePrCommentOptions {
  body?: string;
  bodyFile?: string;
  editor?: boolean;
  json?: boolean;
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
  repoUrlArg: string | undefined,
  body: string,
  options: CreatePrCommentOptions = {},
) {
  let repoUrl = '';
  await withClient(
    async (client) => {
      const resolved = await resolveRepoUrl(repoUrlArg);
      repoUrl = resolved.repoUrl;

      if (!resolved.owner || !resolved.repo) {
        const parsed = parseGitUrl(repoUrl);
        if (!parsed) {
          throw new Error(
            'Unrecognized repository URL. Provide a full git URL or run inside a git repo.',
          );
        }
      }

      let prNum = Number.parseInt(prNumber, 10);
      const resourcePrNumber = resolved.resource?.type === 'pull' ? resolved.resource.number : undefined;

      if (Number.isNaN(prNum)) {
        if (resourcePrNumber !== undefined) {
          prNum = resourcePrNumber;
        }
      }

      if (Number.isNaN(prNum)) {
        throw new Error('Invalid PR number');
      }

      if (resourcePrNumber !== undefined && prNum !== resourcePrNumber) {
        throw new Error('PR number mismatch between argument and repository reference');
      }

      const comment = await client.pr.createComment(repoUrl, prNum, body);

      if (options.json) {
        console.log(JSON.stringify(comment, null, 2));
      } else {
        const preview = comment.body.length > 100 ? comment.body.substring(0, 100) + '...' : comment.body;
        console.log('💬 PR comment created successfully');
        console.log(`   PR:        #${prNum}`);
        console.log(`   Comment:   ${comment.id}`);
        console.log(`   Preview:   "${preview}"`);
      }
    },
    (error) => {
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
    },
  );
}

export function createPrCommentCommand(): Command {
  return new Command('comment')
    .description('Create a comment on a pull request')
    .argument('<pr-number>', 'Pull request number')
    .argument('[url]', 'Repository URL or identifier')
    .option('--body <string>', 'Supply a comment body')
    .option(
      '-F, --body-file <file>',
      'Read body text from file (use "-" to read from standard input)',
    )
    .option('-e, --editor', 'Open text editor to write the comment')
    .option('--json', 'Output raw JSON instead of formatted output')
    .action(
      async (prNumber: string, repoUrlArg: string | undefined, options: CreatePrCommentOptions = {}) => {
        const trimmedRepoArg = repoUrlArg?.trim() || undefined;

        // 获取评论内容
        let finalBody = options.body || '';

        if (options.bodyFile) {
          if (options.bodyFile === '-') {
            finalBody = fs.readFileSync(0, 'utf-8').trim();
          } else {
            if (!fs.existsSync(options.bodyFile)) {
              throw new Error(`File not found: ${options.bodyFile}`);
            }
            finalBody = fs.readFileSync(options.bodyFile, 'utf-8').trim();
          }
        } else if (options.editor) {
          const template = `# Comment on Pull Request #${prNumber}

<!-- Write your comment below -->`;
          finalBody = await openEditor(template);
        } else if (!finalBody) {
          const promptMsg = 'Enter comment body (press Ctrl+D when finished, or use -e/--editor):';
          console.log(promptMsg);
          finalBody = fs.readFileSync(0, 'utf-8').trim();
        }

        if (!finalBody) {
          throw new Error('Comment body is required');
        }

        await createPrCommentAction(prNumber, trimmedRepoArg, finalBody, options);
      },
    );
}
