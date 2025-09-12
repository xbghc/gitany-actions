import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export type Permission = string;

export interface AskClaudeOptions {
  permissions?: Permission[];
}

const execFileAsync = promisify(execFile);

export async function askClaude(
  msg: string,
  cwd: string,
  options: AskClaudeOptions = {},
): Promise<string> {
  const { permissions } = options;

  if (!process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error('ANTHROPIC_AUTH_TOKEN is required');
  }

  const args = ['-p', msg, '--output-format', 'text'];
  if (permissions && permissions.length > 0) {
    args.push('--allowedTools', permissions.join(','));
  }

  const { stdout } = await execFileAsync('claude', args, {
    cwd,
    env: process.env,
  });
  return stdout.trim();
}

