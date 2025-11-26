import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import { logger, generateRequestId } from '../utils/logger.js';

// 敏感参数名列表（不记录这些参数的值）
const SENSITIVE_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'code', // OAuth code
  'state', // OAuth state
];

/**
 * 过滤敏感查询参数
 */
function sanitizeQuery(query: unknown): Record<string, unknown> | undefined {
  if (!query || typeof query !== 'object') {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (SENSITIVE_PARAMS.some((param) => key.toLowerCase().includes(param))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * HTTP 请求日志中间件
 *
 * 功能：
 * 1. 为每个请求生成唯一 ID
 * 2. 记录请求开始和结束
 * 3. 记录响应时间和状态码
 * 4. 过滤敏感信息
 */
export const requestLogger = pinoHttp.default({
  logger,

  // 生成请求 ID
  genReqId: (req: IncomingMessage) => {
    return (req.headers['x-request-id'] as string) || generateRequestId();
  },

  // 自定义请求日志格式
  customProps: (req: IncomingMessage) => ({
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length'],
  }),

  // 自定义日志级别（根据状态码）
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    err: Error | undefined,
  ): 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },

  // 自定义成功消息
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  // 自定义错误消息
  customErrorMessage: (_req: IncomingMessage, res: ServerResponse) => {
    return `Request failed with status ${res.statusCode}`;
  },

  // 序列化请求（过滤敏感信息）
  serializers: {
    req: (req: Record<string, unknown>) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: sanitizeQuery(req.query),
      // 不记录完整的 headers，只记录必要的
      headers: {
        host: (req.headers as Record<string, unknown>)?.host,
        'content-type': (req.headers as Record<string, unknown>)?.['content-type'],
        'x-request-id': (req.headers as Record<string, unknown>)?.['x-request-id'],
      },
    }),
    res: (res: Record<string, unknown>) => ({
      statusCode: res.statusCode,
    }),
  },

  // 不记录健康检查和静态资源
  autoLogging: {
    ignore: (req: IncomingMessage) => {
      const ignorePaths = ['/health', '/favicon.ico'];
      return ignorePaths.some((path) => req.url?.startsWith(path));
    },
  },

  // 将请求 ID 附加到响应头
  wrapSerializers: true,
});
