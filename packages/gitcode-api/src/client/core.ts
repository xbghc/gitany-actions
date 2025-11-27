import got, { type Got } from 'got';
import { GitCodeClientAuth } from './auth/index.js';
import { type HttpErrorResponse } from './http-error.js';
import { GitCodeClientIssue } from './issue/index.js';
import { GitCodeClientPr } from './pr/index.js';
import { GitCodeClientRepo } from './repo/index.js';
import { GitCodeClientUser } from './user/index.js';

/**
 * GitCodeClient 选项
 */
export interface GitCodeClientOptions {
  /** 自定义 got 实例 */
  http?: Got;
  /** 当 API 返回 401 时的回调函数 */
  onUnauthorized?: () => void;
}

/**
 * 检查参数是否为 Got 实例
 * Got 实例是一个带有 get/post/extend 方法的可调用对象
 * 也支持 mock Got 实例（不可调用但有这些方法）
 */
function isGotInstance(obj: unknown): obj is Got {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const maybeGot = obj as Record<string, unknown>;

  // Got 实例应该有这些核心方法
  return (
    typeof maybeGot.get === 'function' &&
    typeof maybeGot.post === 'function' &&
    typeof maybeGot.extend === 'function' &&
    // 区分 Got 实例和选项对象：选项对象有 http 或 onUnauthorized 属性
    !('http' in maybeGot) &&
    !('onUnauthorized' in maybeGot)
  );
}

export class GitCodeClient {
  public readonly http: Got;
  pr = new GitCodeClientPr(this);
  repo = new GitCodeClientRepo(this);
  issue = new GitCodeClientIssue(this);
  user = new GitCodeClientUser(this);
  auth: GitCodeClientAuth;

  /**
   * Rate limit 结束时间（Unix timestamp）
   * 当值大于当前时间时，表示正在限流中
   */
  private rateLimitedUntil: number = 0;

  /** 401 回调函数 */
  private onUnauthorized?: () => void;

  /**
   * 创建 GitCode API 客户端
   * @param token - 认证 token（PAT 或 OAuth access token）
   * @param optionsOrHttp - 选项对象或自定义 got 实例（向后兼容）
   */
  constructor(token?: string, optionsOrHttp?: GitCodeClientOptions | Got) {
    // 解析参数（向后兼容）
    let customHttp: Got | undefined;
    let options: GitCodeClientOptions = {};

    if (optionsOrHttp) {
      if (isGotInstance(optionsOrHttp)) {
        // 向后兼容：第二个参数是 Got 实例
        customHttp = optionsOrHttp;
      } else {
        // 新格式：第二个参数是选项对象
        options = optionsOrHttp;
        customHttp = options.http;
      }
    }

    // 保存回调
    this.onUnauthorized = options.onUnauthorized;

    // 先初始化 auth（在配置 http 之前）
    this.auth = new GitCodeClientAuth(this, token);

    if (customHttp) {
      // 使用外部传入的 got 实例
      this.http = customHttp;
    } else {
      // 创建默认的 got 实例，包含 OAuth 支持、rate limiting 和自动重试
      this.http = got.extend({
        headers: {
          accept: 'application/json',
        },
        retry: {
          limit: 3,
          statusCodes: [408, 429, 500, 502, 503, 504],
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
        hooks: {
          beforeRequest: [
            async (options) => {
              // 动态设置 authorization header（支持 OAuth 自动刷新）
              try {
                const validToken = await this.auth.getValidToken();
                if (validToken) {
                  options.headers.authorization = `Bearer ${validToken}`;
                }
              } catch {
                // 如果获取 token 失败，继续发送请求（可能是公开 API）
                // 实际的认证错误会在 API 响应中处理
              }

              // 检查是否还在限流中
              const now = Date.now();
              if (this.rateLimitedUntil > now) {
                const waitSeconds = Math.ceil((this.rateLimitedUntil - now) / 1000);
                const response: HttpErrorResponse = {
                  statusCode: 429,
                  headers: { 'retry-after': String(waitSeconds) },
                };
                const error: Error & { response: HttpErrorResponse } = Object.assign(
                  new Error(`Rate limited. Retry after ${waitSeconds} seconds`),
                  { response },
                );
                throw error;
              }
            },
          ],
          afterResponse: [
            (response) => {
              // 检查是否触发限流
              if (response.statusCode === 429) {
                const retryAfter = response.headers['retry-after'];
                if (retryAfter) {
                  const delaySeconds = parseInt(String(retryAfter), 10);
                  this.rateLimitedUntil = Date.now() + delaySeconds * 1000;
                  console.warn(`[GitCode API] Rate limited. Retry after ${delaySeconds}s`);
                }
              }

              // 检查是否 401 未授权
              if (response.statusCode === 401 && this.onUnauthorized) {
                this.onUnauthorized();
              }

              return response;
            },
          ],
        },
      });
    }
  }

  /**
   * 检查当前是否处于限流状态
   * @returns true 表示正在限流中，不应发送请求
   */
  public isRateLimited(): boolean {
    return this.rateLimitedUntil > Date.now();
  }

  /**
   * 获取限流剩余等待时间（秒）
   * @returns 剩余等待时间，0 表示未限流
   */
  public getRateLimitWaitTime(): number {
    const wait = this.rateLimitedUntil - Date.now();
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
  }
}

// 保持向后兼容的别名
export { GitCodeClient as GitcodeClient };
