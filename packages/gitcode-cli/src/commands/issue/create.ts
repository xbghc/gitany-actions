import { Command } from 'commander';
import { parseGitUrl } from '@xbghc/gitcode-api';
import type { CreateIssueBody, CreatedIssue } from '@xbghc/gitcode-api';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { withClient } from '../../utils/with-client.js';
import { resolveGitCodeRepoUrl } from '../../utils/resolve-repo-url.js';
import { formatAssignees } from './helpers.js';

export interface CreateOptions {
  title?: string;
  body?: string;
  assignee?: string | string[];
  milestone?: number;
  labels?: string[];
  security_hole?: string;
  template_path?: string;
  bodyFile?: string;
  editor?: boolean;
  json?: boolean;
  repo?: string;
}

// 模拟交互式提示（简化版本）
async function promptForInput(message: string, defaultValue?: string): Promise<string> {
  if (defaultValue) {
    process.stdout.write(`${message} (${defaultValue}): `);
  } else {
    process.stdout.write(`${message}: `);
  }

  // 在真实环境中，这里应该使用 readline 或类似的库
  // 为了演示，我们返回默认值或空字符串
  return defaultValue || '';
}

// 获取默认编辑器
function getDefaultEditor(): string {
  return process.env.EDITOR || process.env.VISUAL || 'nano';
}

// 在编辑器中打开内容
async function openEditor(content: string): Promise<string> {
  const editor = getDefaultEditor();
  const tempFile = path.join(process.cwd(), '.gitcode-issue-temp.md');

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

export async function createAction(
  owner: string,
  repo: string,
  title?: string,
  options: CreateOptions = {},
) {
  await withClient(async (client) => {
    // 获取 title（交互式提示）
    let finalTitle = title || options.title;
    if (!finalTitle) {
      finalTitle = await promptForInput('Title');
      if (!finalTitle) {
        throw new Error('Title is required');
      }
    }

    // 获取 body
    let finalBody = options.body || '';

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
      const template = `# Issue Title: ${finalTitle}

<!-- Describe your issue in detail below -->`;
      finalBody = await openEditor(template);
    } else if (!finalBody) {
      // 交互式提示
      finalBody = await promptForInput('Body', '(leave empty to skip)');
    }

    // 处理 assignee: 支持字符串或数组
    let finalAssignee: string | undefined;
    if (options.assignee) {
      const assignees = Array.isArray(options.assignee) ? options.assignee : [options.assignee];
      // 处理 @me 特殊值
      const processedAssignees = assignees
        .map((a) => {
          if (a === '@me') {
            // 在真实环境中，这里应该获取当前用户信息
            console.log('Note: @me assignment will be implemented in future versions');
            return null;
          }
          return a;
        })
        .filter((a): a is string => a !== null);

      if (processedAssignees.length > 0) {
        // 将数组合并为逗号分隔的字符串
        finalAssignee = processedAssignees.join(',');
      }
    }

    const body: CreateIssueBody = {
      repo,
      title: finalTitle,
      body: finalBody,
    };

    if (finalAssignee) body.assignee = finalAssignee;
    if (options.milestone) body.milestone = options.milestone;
    if (options.labels && options.labels.length > 0) {
      body.labels = options.labels.join(',');
    }
    if (options.security_hole) body.security_hole = options.security_hole;
    if (options.template_path) body.template_path = options.template_path;

    const issue: CreatedIssue = await client.issue.create({
      owner,
      repo,
      body,
    });

    if (options.json) {
      console.log(JSON.stringify(issue, null, 2));
    } else {
      // GitHub CLI 风格的彩色输出
      console.log('\n🎉 Issue created successfully!');
      console.log('\n📋 Issue Details:');
      console.log(`   Title:    ${issue.title}`);
      console.log(`   Number:   #${issue.number}`);
      console.log(`   State:    ${getStateColor(issue.state)}${issue.state}${colors.reset}`);
      console.log(`   URL:      ${colors.blue}${issue.html_url}${colors.reset}`);

      const assigneesText = formatAssignees(issue.assignees);
      if (assigneesText) {
        console.log(`   Assignees: ${assigneesText}`);
      }

      if (issue.labels && issue.labels.length > 0) {
        const labelNames = issue.labels.map((l) => l.name).join(', ');
        console.log(`   Labels:   ${labelNames}`);
      }

      console.log(`\n💡 Next steps:`);
      console.log(`   • View the issue: ${colors.blue}${issue.html_url}${colors.reset}`);
      console.log(`   • Add labels:    gitcode issue edit ${issue.number} --label bug`);
      console.log(`   • Add assignee:  gitcode issue edit ${issue.number} --assignee @me`);
    }
  }, 'Failed to create issue');
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
  bright: '\x1b[1m',
};

// 根据 issue 状态返回相应的颜色
function getStateColor(state: string): string {
  switch (state.toLowerCase()) {
    case 'open':
      return colors.green;
    case 'closed':
      return colors.red;
    default:
      return colors.yellow;
  }
}

export function createCommand(): Command {
  return new Command('create')
    .description('Create a new issue')
    .argument(
      '[owner]',
      'Repository owner (user or organization) - can be omitted if --repo is used',
    )
    .argument('[repo]', 'Repository name - can be omitted if --repo is used')
    .argument('[title]', 'Issue title - will prompt if not provided')
    .option('-t, --title <string>', 'Supply a title. Will prompt for one otherwise')
    .option('-b, --body <string>', 'Supply a body. Will prompt for one otherwise')
    .option(
      '-F, --body-file <file>',
      'Read body text from file (use "-" to read from standard input)',
    )
    .option('-e, --editor', 'Skip prompts and open the text editor to write the title and body')
    .option(
      '-a, --assignee <login>',
      'Assign people by their login (can be used multiple times, or use comma-separated values). Use "@me" to self-assign',
      (value: string, previous: string[] = []) => previous.concat(value),
    )
    .option(
      '-l, --label <name>',
      'Add labels by name (can be used multiple times)',
      (val: string, previous: string[] = []) => previous.concat([val]),
    )
    .option('-m, --milestone <number>', 'Add the issue to a milestone by number', (val) =>
      parseInt(val, 10),
    )
    .option('--security-hole <security-hole>', 'Security hole level')
    .option('--template-path <template-path>', 'Template path')
    .option('--json', 'Output raw JSON instead of formatted output')
    .option(
      '-R, --repo <[HOST/]OWNER/REPO>',
      'Select another repository using the [HOST/]OWNER/REPO format',
    )
    .action(
      async (ownerArg?: string, repoArg?: string, titleArg?: string, options?: CreateOptions) => {
        const optionsToUse = options || {};

        // 处理 --repo 标志
        if (optionsToUse.repo) {
          const parsed = parseGitUrl(optionsToUse.repo);
          if (parsed) {
            ownerArg = parsed.owner;
            repoArg = parsed.repo;
          } else {
            const parts = optionsToUse.repo.split('/');
            if (parts.length === 3) {
              ownerArg = parts[1];
              repoArg = parts[2];
            } else if (parts.length === 2) {
              ownerArg = parts[0];
              repoArg = parts[1];
            } else {
              throw new Error('Invalid repository format. Use [HOST/]OWNER/REPO');
            }
          }
        }

        // 自动检测仓库（从 git remote origin 获取）
        if (!ownerArg || !repoArg) {
          const repoUrl = await resolveGitCodeRepoUrl();
          const parsed = parseGitUrl(repoUrl);
          if (parsed) {
            ownerArg = parsed.owner;
            repoArg = parsed.repo;
          }
        }

        if (!ownerArg || !repoArg) {
          throw new Error('无法检测仓库信息，请在 git 仓库目录下运行或使用 --repo OWNER/REPO 指定');
        }

        await createAction(ownerArg, repoArg, titleArg || optionsToUse.title, optionsToUse);
      },
    );
}
