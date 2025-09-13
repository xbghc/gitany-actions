import pino, { type Logger as PinoLogger } from 'pino';

// Resolve desired level from env; ignore invalid values
function resolveLevel(): string | undefined {
  const raw = (process.env.GITANY_LOG_LEVEL || process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (!raw) return undefined;
  const allowed = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
  return allowed.has(raw) ? raw : undefined;
}

export type Logger = PinoLogger;
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

// Track all created loggers so we can update levels globally (CLI flags)
const registry: Logger[] = [];

export function createLogger(name?: string): Logger {
  const opts: Record<string, unknown> = { name };
  const level = resolveLevel();
  if (level) opts.level = level;
  // Send logs to stderr to avoid polluting CLI stdout
  const instance = pino(opts, pino.destination(2));
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
