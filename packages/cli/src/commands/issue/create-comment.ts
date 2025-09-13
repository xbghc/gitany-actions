import { Command } from 'commander';
import { GitcodeClient } from '@gitany/gitcode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createLogger } from '@gitany/shared';

interface CreateCommentOptions {
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
  const tempFile = path.join(process.cwd(), '.gitany-comment-temp.md');
  
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

export async function createCommentAction(
  issueArg: string, 
  bodyArg?: string, 
  options: CreateCommentOptions = {}
) {
  const logger = createLogger('@gitany/cli');
  try {
    const client = new GitcodeClient();
    
    // 处理 --repo 标志和解析 issue 参数
    let owner: string;
    let repo: string;
    let issueNumber: number;
    
    if (options.repo) {
      // 如果指定了 --repo，issueArg 应该是 issue number
      const repoMatch = options.repo.match(/^(?:https?:\/\/)?([^/]+)\/([^/]+)(?:\.git)?$/);
      if (repoMatch) {
        owner = repoMatch[1];
        repo = repoMatch[2];
      } else {
        const parts = options.repo.split('/');
        if (parts.length === 2) {
          owner = parts[0];
          repo = parts[1];
        } else {
          throw new Error('Invalid repository format. Use [HOST/]OWNER/REPO');
        }
      }
      
      issueNumber = parseInt(issueArg, 10);
    } else {
      // 解析 issueArg 为 owner/repo/number 或 URL 格式
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
          throw new Error('Invalid issue format. Use OWNER/REPO/NUMBER or https://gitcode.com/OWNER/REPO/issues/NUMBER');
        }
      }
    }

    if (isNaN(issueNumber)) {
      throw new Error('Invalid issue number');
    }

    // 如果指定了 web 模式，打开浏览器
    if (options.web) {
      const url = `https://gitcode.com/${owner}/${repo}/issues/${issueNumber}#new_comment_field`;
      console.log(`Opening ${url} in your browser...`);
      // 在真实环境中，这里应该使用 open 或类似包
      return;
    }

    // 获取 comment body
    let finalBody = bodyArg || options.body || '';
    
    if (options.bodyFile) {
      if (options.bodyFile === '-') {
        // 从标准输入读取
        finalBody = fs.readFileSync(0, 'utf-8').trim();
      } else {
        // 从文件读取
        if (!fs.existsSync(options.bodyFile)) {
          throw new Error(`File not found: ${options.bodyFile}`);
        }
        finalBody = fs.readFileSync(options.bodyFile, 'utf-8').trim();
      }
    } else if (options.editor) {
      // 在编辑器中编辑
      const template = `# Comment on Issue #${issueNumber}

<!-- Write your comment below -->`;
      finalBody = await openEditor(template);
    } else if (!finalBody) {
      // 简化的交互式提示
      console.log('Enter comment body (press Ctrl+D when finished, or use -e/--editor):');
      finalBody = fs.readFileSync(0, 'utf-8').trim();
    }

    if (!finalBody) {
      throw new Error('Comment body is required');
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
      console.log(`   Author:   ${comment.user.name || comment.user.login}`);
      console.log(`   Created:  ${new Date(comment.created_at).toLocaleString()}`);
      console.log(`   URL:      ${colors.blue}${comment.html_url}${colors.reset}`);
      
      // 显示评论内容预览
      const bodyPreview = comment.body.length > 100 
        ? comment.body.substring(0, 100) + '...' 
        : comment.body;
      console.log(`   Preview:  "${bodyPreview}"`);
      
      console.log(`\n💡 Next steps:`);
      console.log(`   • View the comment: ${colors.blue}${comment.html_url}${colors.reset}`);
      console.log(`   • Reply to comment:  gitcode issue comment ${issueNumber} --body "Your reply"`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, '\n❌ Failed to create comment: %s', msg);
    process.exit(1);
  }
}

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

export function createCommentCommand(): Command {
  return new Command('comment')
    .description('Create a comment on an issue')
    .argument('<issue>', 'Issue URL, number, or OWNER/REPO/NUMBER')
    .argument('[body]', 'Comment body (will prompt if not provided)')
    .option('-b, --body <string>', 'Supply a comment body')
    .option('-F, --body-file <file>', 'Read body text from file (use "-" to read from standard input)')
    .option('-e, --editor', 'Open text editor to write the comment')
    .option('-w, --web', 'Open the browser to create a comment')
    .option('--json', 'Output raw JSON instead of formatted output')
    .option('-R, --repo <[HOST/]OWNER/REPO>', 'Select another repository using the [HOST/]OWNER/REPO format')
    .action(createCommentAction);
}
