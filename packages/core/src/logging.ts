export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
}

export type LoggerFactory = (scope?: string) => Logger;

function createConsoleLogger(scope?: string): Logger {
  const prefix = scope ? `[${scope}]` : undefined;
  const withPrefix = (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) => (prefix ? fn(prefix, ...args) : fn(...args));
  return {
    info: withPrefix(console.log.bind(console)),
    warn: withPrefix(console.warn.bind(console)),
    error: withPrefix(console.error.bind(console)),
    debug: withPrefix(console.debug.bind(console)),
  };
}

let factory: LoggerFactory = createConsoleLogger;

export function setLoggerFactory(next: LoggerFactory) {
  factory = next;
}

export function getLogger(scope?: string): Logger {
  return factory(scope);
}

