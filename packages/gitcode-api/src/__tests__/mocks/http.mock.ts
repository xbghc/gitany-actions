import { vi } from 'vitest';
import type { Got, Response } from 'got';

/**
 * Mock 响应配置
 */
export interface MockResponse {
  /** 成功响应数据 */
  data?: unknown;
  /** 错误响应（会被抛出） */
  error?: Error & { response?: MockHttpErrorResponse };
}

/**
 * Mock HTTP 错误响应
 */
export interface MockHttpErrorResponse {
  statusCode: number;
  headers?: Record<string, string>;
}

/**
 * Mock 请求记录
 */
export interface MockRequestRecord {
  method: string;
  url: string;
  options?: unknown;
}

/**
 * 创建 Mock Got 实例
 *
 * @param responses - URL 到响应的映射，支持 "METHOD:url" 或仅 "url" 格式
 * @returns Mock Got 实例和请求记录
 *
 * @example
 * ```typescript
 * const responses = new Map<string, MockResponse>();
 * responses.set('GET:repos/owner/repo/pulls', { data: [] });
 * responses.set('POST:repos/owner/repo/pulls', { data: { number: 1 } });
 *
 * const { mockGot, requests } = createMockGot(responses);
 * const client = new GitCodeClient('token', mockGot);
 *
 * await client.pr.list('https://gitcode.com/owner/repo');
 * expect(requests).toHaveLength(1);
 * ```
 */
export function createMockGot(responses: Map<string, MockResponse> = new Map()): {
  mockGot: Got;
  requests: MockRequestRecord[];
} {
  const requests: MockRequestRecord[] = [];

  const createMockRequest = (method: string) => {
    return vi.fn().mockImplementation((url: string, opts?: unknown) => {
      requests.push({ method, url, options: opts });

      return {
        json: async () => {
          // 尝试 "METHOD:url" 格式
          let response = responses.get(`${method}:${url}`);

          // 尝试仅 "url" 格式
          if (!response) {
            response = responses.get(url);
          }

          // 尝试部分匹配（用于动态 URL）
          if (!response) {
            for (const [key, value] of responses.entries()) {
              if (url.includes(key) || key.includes(url)) {
                response = value;
                break;
              }
            }
          }

          if (!response) {
            throw new Error(`No mock response for ${method} ${url}`);
          }

          if (response.error) {
            throw response.error;
          }

          return response.data;
        },
      };
    });
  };

  const mockGot = {
    get: createMockRequest('GET'),
    post: createMockRequest('POST'),
    put: createMockRequest('PUT'),
    delete: createMockRequest('DELETE'),
    patch: createMockRequest('PATCH'),
    extend: vi.fn().mockImplementation(() => mockGot),
  } as unknown as Got;

  return { mockGot, requests };
}

/**
 * 创建 HTTP 错误对象
 *
 * @param statusCode - HTTP 状态码
 * @param headers - 响应头
 * @param message - 错误消息
 * @returns 带 response 属性的 Error 对象
 *
 * @example
 * ```typescript
 * const error = createHttpError(429, { 'retry-after': '60' });
 * responses.set('GET:some/url', { error });
 * ```
 */
export function createHttpError(
  statusCode: number,
  headers?: Record<string, string>,
  message?: string,
): Error & { response: MockHttpErrorResponse } {
  const error = new Error(message || `Request failed with status ${statusCode}`) as Error & {
    response: MockHttpErrorResponse;
  };
  error.response = { statusCode, headers };
  return error;
}

/**
 * 创建 Mock 的 afterResponse 钩子响应
 *
 * @param statusCode - HTTP 状态码
 * @param headers - 响应头
 * @returns Mock Response 对象
 */
export function createMockResponse(
  statusCode: number,
  headers?: Record<string, string | string[]>,
): Partial<Response> {
  return {
    statusCode,
    headers: headers || {},
  };
}
