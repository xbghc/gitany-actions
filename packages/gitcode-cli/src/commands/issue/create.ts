import { Command } from 'commander';
import { parseGitUrl } from '@gitany/gitcode';
import type { CreateIssueBody, CreatedIssue } from '@gitany/gitcode';
import { resolveRepoUrl } from '@gitany/git-lib';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { withClient } from '../../utils/with-client';
import { formatAssignees } from './helpers';

export interface CreateOptions {
  title?: string;
  body?: string;
  assignee?: string;
  milestone?: number;
  labels?: string[];
  security_hole?: string;
  template_path?: string;
  bodyFile?: string;
  editor?: boolean;
  json?: boolean;
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
  const tempFile = path.join(process.cwd(), '.gitany-issue-temp.md');

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
  repoUrlArg: string | undefined,
  titleArg: string | undefined,
  options: CreateOptions = {},
) {
  await withClient(async (client) => {
    const resolved = await resolveRepoUrl(repoUrlArg);
    let owner = resolved.owner;
    let repo = resolved.repo;
    if (!owner || !repo) {
      const parsedRepo = parseGitUrl(resolved.repoUrl);
      if (!parsedRepo) {
        throw new Error('Unrecognized repository URL. Provide OWNER/REPO or a full git URL.');
      }
      owner = parsedRepo.owner;
      repo = parsedRepo.repo;
    }

    // 获取 title（交互式提示）
    let finalTitle = titleArg ?? options.title;
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

    // 处理 @me 特殊值
    let finalAssignee = options.assignee;
    if (finalAssignee === '@me') {
      // 在真实环境中，这里应该获取当前用户信息
      console.log('Note: @me assignment will be implemented in future versions');
      finalAssignee = undefined;
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
    .argument('[url]', 'Repository URL or OWNER/REPO (defaults to current git remote)')
    .argument('[title]', 'Issue title - will prompt if not provided')
    .option('-t, --title <string>', 'Supply a title. Will prompt for one otherwise')
    .option('-b, --body <string>', 'Supply a body. Will prompt for one otherwise')
    .option(
      '-F, --body-file <file>',
      'Read body text from file (use "-" to read from standard input)',
    )
    .option('-e, --editor', 'Skip prompts and open the text editor to write the title and body')
    .option('-a, --assignee <login>', 'Assign people by their login. Use "@me" to self-assign')
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
    .action(
      async (repoArg?: string, titleArg?: string, options?: CreateOptions) => {
        const optionsToUse = options || {};

        let repoInput = repoArg?.trim() || undefined;
        let titleInput = titleArg;

        if (repoInput && !/^(?:https?:\/\/|git@)/i.test(repoInput) && !repoInput.includes('/')) {
          titleInput = titleInput ?? repoInput;
          repoInput = undefined;
        }

        await createAction(repoInput, titleInput, optionsToUse);
      },
    );
}
