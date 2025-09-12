import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export type Permission = string;

export interface AskClaudeOptions {
  permissions?: Permission[];
}

const execFileAsync = promisify(execFile);

// Use JSON output so Claude can decide if follow-up edits are needed
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
