import {
  parseGitUrl,
  type CreatedIssueComment,
  type CreatedPrComment,
  type GitcodeClient,
  type UpdatedIssueComment,
} from '@gitany/gitcode';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { ChatResult } from '../container';
import type { AiMentionContext, AiMentionReply } from './types';

const require = createRequire(import.meta.url);
let cachedGitcodeCliEntry: string | null = null;

export function defaultReplyBodyBuilder(result: ChatResult): string | null {
  const text = result.output?.trim();
  return text && text.length > 0 ? text : null;
}

export async function editAiReplyComment(
  client: GitcodeClient,
  repoUrl: string,
  commentId: number,
  body: string,
): Promise<UpdatedIssueComment> {
  const parsed = parseGitUrl(repoUrl);
  if (!parsed) {
    throw new Error(`Invalid repository URL: ${repoUrl}`);
  }

  const token = (await client.auth.token())?.trim();
  const cliEnv: NodeJS.ProcessEnv = {};
  if (token) {
    cliEnv.GITCODE_TOKEN = token;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcode-cli-'));

  try {
    const bodyFile = path.join(tempDir, `${randomUUID()}.md`);
    await fs.writeFile(bodyFile, body, 'utf8');

    const args = [
      'issue',
      'edit-comment',
      String(commentId),
      '--body-file',
      bodyFile,
      '--repo',
      repoUrl,
      '--json',
    ];
    const { stdout } = await runGitcodeCli(args, { env: cliEnv });
    const text = stdout.trim();
    if (!text) {
      throw new Error('gitcode CLI returned empty output when editing issue comment');
    }
    return JSON.parse(text) as UpdatedIssueComment;
  } finally {
    await removeTempDir(tempDir);
  }
}

export async function createAiReplyComment(
  client: GitcodeClient,
  repoUrl: string,
  context: AiMentionContext,
  body: string,
): Promise<AiMentionReply> {
  const parsed = parseGitUrl(repoUrl);
  if (!parsed) {
    throw new Error(`Invalid repository URL: ${repoUrl}`);
  }

  const repoArg = `${parsed.owner}/${parsed.repo}`;
  const token = (await client.auth.token())?.trim();
  const cliEnv: NodeJS.ProcessEnv = {};
  if (token) {
    cliEnv.GITCODE_TOKEN = token;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcode-cli-'));

  try {
    const bodyFile = path.join(tempDir, `${randomUUID()}.md`);
    await fs.writeFile(bodyFile, body, 'utf8');

    if (context.commentSource === 'issue_comment') {
      const args = [
        'issue',
        'comment',
        String(context.issueNumber),
        '--body-file',
        bodyFile,
        '--repo',
        repoArg,
        '--json',
      ];
      const { stdout } = await runGitcodeCli(args, { env: cliEnv });
      const text = stdout.trim();
      if (!text) {
        throw new Error('gitcode CLI returned empty output when creating issue comment');
      }
      const comment = JSON.parse(text) as CreatedIssueComment;
      return { source: 'issue_comment', body, comment } satisfies AiMentionReply;
    }

    const prNumber = context.pullRequest?.number ?? context.issueNumber;
    if (!Number.isFinite(prNumber)) {
      throw new Error(`Invalid pull request number: ${prNumber}`);
    }
    const args = [
      'pr',
      'comment',
      String(prNumber),
      '--body-file',
      bodyFile,
      '--repo',
      repoArg,
      '--json',
    ];
    const { stdout } = await runGitcodeCli(args, { env: cliEnv });
    const text = stdout.trim();
    if (!text) {
      throw new Error('gitcode CLI returned empty output when creating PR comment');
    }
    const comment = JSON.parse(text) as CreatedPrComment;
    return { source: 'pr_review_comment', body, comment } satisfies AiMentionReply;
  } finally {
    await removeTempDir(tempDir);
  }
}

function resolveGitcodeCliEntry(): string {
  if (cachedGitcodeCliEntry) return cachedGitcodeCliEntry;

  let packageJsonPath: string;
  try {
    packageJsonPath = require.resolve('@gitany/cli/package.json');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to locate @gitany/cli package: ${message}`);
  }

  const cliDir = path.dirname(packageJsonPath);
  const pkg = require('@gitany/cli/package.json') as { bin?: Record<string, string> };
  const binRelative = pkg.bin?.gitcode ?? 'dist/index.js';
  const entry = path.resolve(cliDir, binRelative);
  cachedGitcodeCliEntry = entry;
  return entry;
}

interface RunGitcodeCliOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

async function runGitcodeCli(
  args: string[],
  options: RunGitcodeCliOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const entry = resolveGitcodeCliEntry();
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const exitCode = code ?? undefined;
      const details = stderr.trim() || stdout.trim();
      const parts = [`gitcode CLI exited with code ${exitCode}`];
      if (details) parts.push(details);
      const error = new Error(parts.join(': '));
      Object.assign(error, { stdout, stderr, exitCode });
      reject(error);
    });
  });
}

async function removeTempDir(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore cleanup errors */
  }
}
