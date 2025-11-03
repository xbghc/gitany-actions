/**
 * 状态存储接口
 * 提供了加载和保存状态的抽象
 *
 * @template TState - 运行时状态类型（可能包含 Map, Set, Date 等）
 *
 * @remarks
 * Storage 实现负责处理 TState 与持久化格式之间的转换（通过 Serializer）
 */
export interface StateStorage<TState = unknown> {
  /**
   * 同步加载状态
   *
   * @param key - 存储键（通常是仓库目录路径）
   * @returns 如果状态存在则返回运行时状态，否则返回 undefined
   *
   * @remarks
   * - 必须是同步操作（保持与当前 loadState 一致）
   * - 如果存储不存在或读取失败，应返回 undefined 而不是抛出错误
   * - 实现应处理 JSON 解析和反序列化错误，返回 undefined
   */
  load(key: string): TState | undefined;

  /**
   * 异步保存状态
   *
   * @param key - 存储键
   * @param state - 运行时状态
   *
   * @remarks
   * - 可以是异步操作
   * - 如果保存失败，实现可以抛出错误，watcher 会捕获并触发事件
   * - 实现应处理序列化和 JSON 字符串化逻辑
   */
  save(key: string, state: TState): Promise<void>;

  /**
   * 删除状态（可选）
   *
   * @param key - 存储键
   *
   * @remarks
   * - 用于清理不再需要的状态
   * - 如果未实现，watcher 不会调用此方法
   */
  delete?(key: string): Promise<void>;
}
