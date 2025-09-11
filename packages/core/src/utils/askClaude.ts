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
  // When provided, we instruct Claude to return JSON that strictly
  // conforms to this JSON Schema (best-effort via prompt constraints).
  // Note: The local `claude` CLI may not expose native structured-output
  // flags; we embed schema guidance into the prompt to approximate.
  responseSchema?: Record<string, unknown>;
}

const execFileAsync = promisify(execFile);

// Use JSON output so Claude can decide if follow-up edits are needed
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
  responseSchema,
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

  // If a schema is provided, wrap the message with strict JSON-only instructions.
  const prompt = responseSchema
    ? [
        '你是一个只输出 JSON 的助手。',
        '请严格按照下方 JSON Schema 输出，且仅输出一个 JSON 对象：',
        JSON.stringify(responseSchema, null, 2),
        '要求：',
        '- 仅输出 JSON（不包含解释、前后缀或代码块标记）',
        '- 必须满足 JSON Schema，缺失字段用空值/空数组/空对象占位',
        '- 不要输出多余字段',
        '',
        '用户请求：',
        msg,
      ].join('\n')
    : msg;

  // Ask Claude CLI for JSON to enable richer responses/flags
  const args = ['-p', prompt, '--format', 'json'];
  if (permissions && permissions.length > 0) {
    args.push('--allowedTools', permissions.join(','));
  }

  const { stdout } = await execFileAsync('claude', args, { cwd, env });

  // Best-effort extract of main textual answer while keeping backward compatibility
  const raw = stdout.trim();
  try {
    const parsed = JSON.parse(raw);
    // Common fields the CLI may return
    if (typeof parsed === 'string') {
      if (responseSchema) {
        try {
          const obj = JSON.parse(parsed);
          return JSON.stringify(obj);
        } catch {
          // not nested JSON; return as-is
        }
      }
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.text === 'string') return parsed.text;
      if (typeof parsed.output === 'string') return parsed.output;
      if (typeof parsed.message === 'string') return parsed.message;
      if (typeof parsed.response === 'string') return parsed.response;
      if (typeof parsed.content === 'string') return parsed.content;
      // Some CLIs wrap content in an array of blocks
      if (Array.isArray(parsed.messages) && parsed.messages.length) {
        const m = parsed.messages[parsed.messages.length - 1];
        if (m && typeof m.text === 'string') {
          if (responseSchema) {
            try {
              const obj = JSON.parse(m.text);
              return JSON.stringify(obj);
            } catch {
              // ignore nested parse failure
            }
          }
          return m.text;
        }
        if (m && typeof m.content === 'string') {
          if (responseSchema) {
            try {
              const obj = JSON.parse(m.content);
              return JSON.stringify(obj);
            } catch {
              // ignore nested parse failure
            }
          }
          return m.content;
        }
      }
    }
  } catch {
    // If not JSON, fall back to raw text
  }
  if (responseSchema) {
    // Try a last-chance direct JSON parse of the raw body
    try {
      const obj = JSON.parse(raw);
      return JSON.stringify(obj);
    } catch {
      // return raw if it wasn't valid JSON
    }
  }
  return raw;
}
