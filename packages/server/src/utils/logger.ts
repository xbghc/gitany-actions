import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 结构化日志 Logger
 * 基于 pino 实现高性能结构化日志
 *
 * 日志级别：
 * - fatal: 系统崩溃
 * - error: 错误但系统可继续运行
 * - warn: 警告信息
 * - info: 一般信息
 * - debug: 调试信息
 * - trace: 详细追踪
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * 生成请求 ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建带上下文的子 logger
 * @param context 上下文信息
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
