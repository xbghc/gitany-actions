import type { StateStorage } from './state-storage.js';

/**
 * 基于内存的状态存储实现
 *
 * 适用于：
 * - 测试场景
 * - 临时监听（不需要持久化）
 * - 无文件系统权限的环境
 *
 * @example
 * ```typescript
 * const storage = new MemoryStateStorage<MyState>();
 * storage.save('key1', { data: 'value' });
 * const state = storage.load('key1');
 * storage.clear(); // 清空所有数据
 * ```
 */
export class MemoryStateStorage<TState = unknown> implements StateStorage<TState> {
  private readonly store = new Map<string, TState>();

  /**
   * 同步加载状态
   *
   * @param key - 存储键
   * @returns 如果状态存在则返回，否则返回 undefined
   */
  load(key: string): TState | undefined {
    return this.store.get(key);
  }

  /**
   * 异步保存状态（内存中是同步的，但保持接口一致）
   *
   * @param key - 存储键
   * @param state - 运行时状态
   */
  async save(key: string, state: TState): Promise<void> {
    this.store.set(key, state);
  }

  /**
   * 删除状态
   *
   * @param key - 存储键
   */
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * 清空所有存储的数据
   *
   * @remarks
   * 此方法不是 StateStorage 接口的一部分，仅在内存存储中提供
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 获取所有存储的键
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * 获取存储的条目数量
   */
  size(): number {
    return this.store.size;
  }
}
