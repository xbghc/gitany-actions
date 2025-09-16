import { Writable } from 'node:stream';
import pino, { stdTimeFunctions, type Logger as PinoLogger, type LoggerOptions } from 'pino';

type LogFormat = 'json' | 'human';

// Resolve desired level from env; ignore invalid values
function resolveLevel(): string | undefined {
  const raw = (process.env.GITANY_LOG_LEVEL || process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (!raw) return undefined;
  const allowed = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
  return allowed.has(raw) ? raw : undefined;
}

function resolveFormat(): LogFormat {
  const raw = (process.env.GITANY_LOG_FORMAT || '').trim().toLowerCase();
  if (raw === 'json') return 'json';
  if (raw === 'human') return 'human';
  return 'human';
}

function formatLocalTime(time: number): string {
  const date = new Date(time);
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = date.getTimezoneOffset() * -1;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absMinutes / 60));
  const offsetMins = pad(absMinutes % 60);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${sign}${offsetHours}:${offsetMins}`;
}

const HUMAN_IGNORED_KEYS = new Set(['msg', 'time', 'name', 'level', 'pid', 'hostname']);

function formatDuration(durationMs: unknown): string | null {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs) || !Number.isFinite(durationMs)) {
    return null;
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  const seconds = durationMs / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
}

function formatKeyValue(key: string, value: unknown): string | null {
  if (key === 'durationMs') {
    const formatted = formatDuration(value);
    return formatted ? `duration=${formatted}` : null;
  }
  if (key === 'err' && value && typeof value === 'object') {
    const error = value as { message?: string; code?: string; type?: string; name?: string };
    const pieces: string[] = [];
    const label = error.code || error.type || error.name;
    if (typeof label === 'string' && label) {
      pieces.push(label);
    }
    if (typeof error.message === 'string' && error.message) {
      pieces.push(error.message);
    }
    return pieces.length ? `error=${pieces.join(': ')}` : null;
  }
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    if (!value) return null;
    return `${key}=${value}`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${key}=${value}`;
  }
  return null;
}

function extractScope(rawMessage?: unknown, fallback?: string): { scope: string; message: string } {
  const defaultScope = fallback ?? 'log';
  if (typeof rawMessage !== 'string' || rawMessage.length === 0) {
    return { scope: defaultScope, message: '' };
  }
  const match = rawMessage.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) {
    return { scope: defaultScope, message: rawMessage };
  }
  const [, scope, rest] = match;
  return { scope, message: rest };
}

class HumanReadableDestination extends Writable {
  private readonly fallbackScope: string | undefined;

  constructor(fallbackScope?: string) {
    super({ decodeStrings: false });
    this.fallbackScope = fallbackScope;
  }

  override _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const lines = (typeof chunk === 'string' ? chunk : chunk.toString('utf8')).split(/\n+/);
    for (const line of lines) {
      if (!line) continue;
      this.writeLine(line);
    }
    callback();
  }

  private writeLine(line: string) {
    let record: Record<string, unknown> | null = null;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      process.stderr.write(`${line}\n`);
      return;
    }

    const { scope, message } = extractScope(record.msg, this.fallbackScope);
    const timestamp = typeof record.time === 'number' ? record.time : Date.now();
    const errorStack =
      record.err && typeof record.err === 'object' && typeof (record.err as { stack?: unknown }).stack === 'string'
        ? ((record.err as { stack: string }).stack as string)
        : undefined;
    const parts = [`${scope}`, message || undefined, formatLocalTime(timestamp)];

    const extraParts: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      if (HUMAN_IGNORED_KEYS.has(key)) continue;
      const formatted = formatKeyValue(key, value);
      if (formatted) extraParts.push(formatted);
    }

    const filtered = parts.filter((part): part is string => Boolean(part));
    const lineParts = [...filtered];
    if (extraParts.length) {
      lineParts.push(...extraParts);
    }
    process.stderr.write(`${lineParts.join(' | ')}\n`);
    if (errorStack) {
      process.stderr.write(`${errorStack}\n`);
    }
  }
}

export type Logger = PinoLogger;
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

// Track all created loggers so we can update levels globally (CLI flags)
const registry: Logger[] = [];

export function createLogger(name?: string): Logger {
  const opts: LoggerOptions = {};
  const level = resolveLevel();
  if (level) opts.level = level;

  const format = resolveFormat();
  let destination: NodeJS.WritableStream;
  if (format === 'human') {
    opts.base = null;
    opts.timestamp = stdTimeFunctions.epochTime;
    opts.formatters = {
      level(_label: string, levelNumber: number) {
        return { level: levelNumber };
      },
    };
    destination = new HumanReadableDestination(name);
  } else {
    if (name) {
      opts.name = name;
    }
    destination = process.stderr;
  }

  const instance = pino(opts, destination);
  registry.push(instance);
  return instance;
}

export const logger: Logger = createLogger('@gitany');

// Allow consumers (e.g., CLI) to set level for all loggers
export function setGlobalLogLevel(level: LogLevel): void {
  for (const l of registry) {
    try {
      l.level = level;
    } catch {
      // ignore
    }
  }
}
