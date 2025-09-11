import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export type Permission = string;

export interface AskClaudeOptions {
  permissions?: Permission[];
  anthropicBaseUrl?: string;
  anthropicAuthToken?: string;
  apiTimeoutMs?: number;
  anthropicModel?: string;
  anthropicSmallFastModel?: string;
  disableNonessentialTraffic?: boolean;
}

const execFileAsync = promisify(execFile);

/**
 * TODO 使用--format json，让claude判断是否需要补充修改
 */
export async function askClaude(
  msg: string,
  cwd: string,
  options: AskClaudeOptions = {}
): Promise<string> {
  const {
    permissions,
    anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL,
    anthropicAuthToken = process.env.ANTHROPIC_AUTH_TOKEN,
    apiTimeoutMs = Number(process.env.API_TIMEOUT_MS) || 60_000,
    anthropicModel = process.env.ANTHROPIC_MODEL,
    anthropicSmallFastModel = process.env.ANTHROPIC_SMALL_FAST_MODEL,
    disableNonessentialTraffic =
      process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === '1',
  } = options;

  if (!anthropicAuthToken) {
    throw new Error('ANTHROPIC_AUTH_TOKEN is required');
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...(anthropicBaseUrl && { ANTHROPIC_BASE_URL: anthropicBaseUrl }),
    ANTHROPIC_AUTH_TOKEN: anthropicAuthToken,
    ...(apiTimeoutMs && { API_TIMEOUT_MS: String(apiTimeoutMs) }),
    ...(anthropicModel && { ANTHROPIC_MODEL: anthropicModel }),
    ...(anthropicSmallFastModel && {
      ANTHROPIC_SMALL_FAST_MODEL: anthropicSmallFastModel,
    }),
    ...(disableNonessentialTraffic && {
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    }),
  };

  const args = ['-p', msg, '--output-format', 'text'];
  if (permissions && permissions.length > 0) {
    args.push('--allowedTools', permissions.join(','));
  }

  const { stdout } = await execFileAsync('claude', args, { cwd, env });
  return stdout.trim();
}

