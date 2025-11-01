import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';
import pretty from 'pino-pretty';

type LogFormat = 'json' | 'human';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
const LOG_LEVEL_SET = new Set<string>(LOG_LEVELS);

function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVEL_SET.has(value);
}

function resolveLevel(): LogLevel | undefined {
  const raw = (process.env.GITANY_LOG_LEVEL || '').trim().toLowerCase();
  if (!raw) return undefined;
  if (!isLogLevel(raw)) return undefined;
  return raw;
}

function resolveFormat(): LogFormat {
  const raw = (process.env.GITANY_LOG_FORMAT || '').trim().toLowerCase();
  if (raw === 'json') return 'json';
  if (raw === 'human') return 'human';
  return 'human';
}

function createPrettyStream(): NodeJS.WritableStream {
  return pretty({
    destination: process.stderr.fd,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
    ignore: 'pid,hostname',
    sync: true,
  });
}

export type Logger = PinoLogger;

const registry: Logger[] = [];

export function createLogger(name?: string): Logger {
  const opts: LoggerOptions = {};
  const level = resolveLevel();
  if (level) opts.level = level;

  if (name) {
    opts.name = name;
  }

  const format = resolveFormat();
  const destination: NodeJS.WritableStream =
    format === 'human' ? createPrettyStream() : process.stderr;

  const instance = pino(opts, destination);
  registry.push(instance);
  return instance;
}

export const logger: Logger = createLogger('@gitany');

export function setGlobalLogLevel(level: LogLevel): void {
  for (const l of registry) {
    try {
      l.level = level;
    } catch {
      // ignore errors from stale logger instances
    }
  }
}
