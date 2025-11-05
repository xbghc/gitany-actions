import Bottleneck from 'bottleneck';

/**
 * HTTP 请求限流器
 *
 * 固定配置:
 * - 每分钟最多 50 个请求 (令牌桶)
 * - 最多 5 个并发请求
 * - 每个请求最小间隔 1200ms (均衡分散)
 *
 * 配合 got 的重试机制处理 429 错误
 */
class RateLimitManager {
  private limiter: Bottleneck;

  constructor() {
    this.limiter = new Bottleneck({
      // 令牌桶：每分钟50个请求
      reservoir: 50,
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60 * 1000,

      // 并发控制与流量均衡
      maxConcurrent: 5,
      minTime: 1200,
    });
  }

  /**
   * 调度 HTTP 请求,自动控制并发和速率
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }
}

export const rateLimitManager = new RateLimitManager();
