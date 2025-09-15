import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { resolveRepoUrl } from '@gitany/git-lib';
import { withClient } from '../../utils/with-client';

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
  await withClient(async (client) => {
    const repoUrl = await resolveRepoUrl(options.repo);

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
    if (options.web) {
      const url = `https://${host}/${owner}/${repo}/pull/${prNum}#new_comment_field`;
      console.log(`Opening ${url} in your browser...`);
      return;
    }

    const comment = await client.pr.createComment(owner, repo, prNum, body);

    if (options.json) {
      console.log(JSON.stringify(comment, null, 2));
    } else {
      // GitHub CLI 风格的彩色输出
      console.log('\n💬 PR comment created successfully!');
      console.log('\n📋 Comment Details:');
      console.log(`   ID:       ${comment.id}`);

      // 显示评论内容预览
      const bodyPreview = comment.body.length > 100
        ? comment.body.substring(0, 100) + '...'
        : comment.body;
      console.log(`   Preview:  "${bodyPreview}"`);

      console.log(`\n💡 Next steps:`);
      console.log(`   • Reply to comment:  gitcode pr comment ${prNumber} --body "Your reply"`);
    }
  }, 'Failed to create PR comment');
}

export function createPrCommentCommand(): Command {
  return new Command('comment')
    .description('Create a comment on a pull request')
    .argument('<pr-number>', 'Pull request number')
    .option('--body <string>', 'Supply a comment body')
    .option('-F, --body-file <file>', 'Read body text from file (use "-" to read from standard input)')
    .option('-e, --editor', 'Open text editor to write the comment')
    .option('-w, --web', 'Open the browser to create a comment')
    .option('--json', 'Output raw JSON instead of formatted output')
    .option('-R, --repo <[HOST/]OWNER/REPO>', 'Select another repository using the [HOST/]OWNER/REPO format')
    .action(async (prNumber: string, options: CreatePrCommentOptions) => {

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
        console.log('Enter comment body (press Ctrl+D when finished, or use -e/--editor):');
        finalBody = fs.readFileSync(0, 'utf-8').trim();
      }

      if (!finalBody) {
        throw new Error('Comment body is required');
      }

      await createPrCommentAction(prNumber, finalBody, options);
    });
}
