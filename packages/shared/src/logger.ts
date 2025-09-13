import pino, { destination, type Logger as PinoLogger } from 'pino';

// Resolve desired level from env
function resolveLevel(): string | undefined {
  return process.env.GITANY_LOG_LEVEL || process.env.LOG_LEVEL || undefined;
}

export type Logger = PinoLogger;

export function createLogger(name?: string): Logger {
  const level = resolveLevel();
  // Send logs to stderr to avoid polluting CLI stdout
  return pino({ name, level }, destination(2));
}

export const logger: Logger = createLogger('@gitany');
