import { TimeoutError } from 'got';
import { isObjectLike } from '../types.js';

export function normalizeGotError(error: unknown, requestUrl: string): Error {
  if (error instanceof TimeoutError) {
    if (error.event === 'request') {
      const details = extractErrorMessage(error) ?? 'connection timed out';
      return new Error(`连接 GitCode 服务器超时: ${requestUrl}. ${details}`);
    }
    return new Error(`等待 GitCode 响应超时: ${requestUrl}`);
  }

  const cause = (error as { cause?: unknown }).cause;
  const code = extractErrorCode(error) ?? extractErrorCode(cause);

  if (code === 'UND_ERR_CONNECT_TIMEOUT') {
    const details = extractErrorMessage(cause) ?? 'connection timed out';
    return new Error(`连接 GitCode 服务器超时: ${requestUrl}. ${details}`);
  }
  if (
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_RESPONSE_TIMEOUT' ||
    code === 'ETIMEDOUT'
  ) {
    return new Error(`等待 GitCode 响应超时: ${requestUrl}`);
  }

  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function extractErrorCode(value: unknown): string | undefined {
  if (!isObjectLike(value)) {
    return undefined;
  }
  const rawCode = (value as { code?: unknown }).code;
  return typeof rawCode === 'string' ? rawCode : undefined;
}

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (!isObjectLike(value)) {
    return undefined;
  }
  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}
