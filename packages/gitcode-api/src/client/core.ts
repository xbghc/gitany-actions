import got, { type Got } from 'got';
import { GitCodeClientAuth } from './auth/index.js';
import { GitCodeClientIssue } from './issue/index.js';
import { GitCodeClientPr } from './pr/index.js';
import { GitCodeClientRepo } from './repo/index.js';
import { GitCodeClientUser } from './user/index.js';

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

  constructor(token?: string, customHttp?: Got) {
    if (customHttp) {
      // 使用外部传入的 got 实例
      this.http = customHttp;
    } else {
      // 创建默认的 got 实例，包含 rate limiting 处理
      this.http = got.extend({
        headers: {
          accept: 'application/json',
          ...(token && { authorization: `Bearer ${token}` }),
        },
        hooks: {
          beforeRequest: [
            () => {
              // 检查是否还在限流中
              const now = Date.now();
              if (this.rateLimitedUntil > now) {
                const waitSeconds = Math.ceil((this.rateLimitedUntil - now) / 1000);
                const error = new Error(`Rate limited. Retry after ${waitSeconds} seconds`);
                (error as any).response = {
                  statusCode: 429,
                  headers: { 'retry-after': String(waitSeconds) },
                };
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
              return response;
            },
          ],
        },
      });
    }
    this.auth = new GitCodeClientAuth(this, token);
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
