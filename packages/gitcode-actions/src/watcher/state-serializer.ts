/**
 * State Serializer - 负责在内存状态和持久化数据之间转换
 *
 * @template TState - 运行时状态类型
 */
export interface StateSerializer<TState> {
  /**
   * 序列化：将运行时状态转换为可 JSON 序列化的格式
   *
   * @param state - 运行时状态（可能包含 Map, Set, Date 等）
   * @returns 可 JSON 序列化的数据
   */
  serialize(state: TState): unknown;

  /**
   * 反序列化：将持久化数据还原为运行时状态
   *
   * @param data - 从 JSON 解析的数据
   * @returns 运行时状态
   */
  deserialize(data: unknown): TState;
}

/**
 * 创建智能序列化器
 *
 * 自动处理以下类型：
 * - Map → {__type: 'Map', entries: [...]}
 * - Set → {__type: 'Set', values: [...]}
 * - Date → {__type: 'Date', value: '...'}
 * - 递归处理嵌套对象和数组
 *
 * @example
 * ```typescript
 * const serializer = createSmartSerializer<{ data: Map<number, Set<string>> }>();
 *
 * const state = { data: new Map([[1, new Set(['a', 'b'])]]) };
 * const json = serializer.serialize(state);
 * // → { data: { __type: 'Map', entries: [[1, { __type: 'Set', values: ['a', 'b'] }]] } }
 *
 * const restored = serializer.deserialize(json);
 * // → { data: Map(1 → Set('a', 'b')) }
 * ```
 */
export function createSmartSerializer<TState>(): StateSerializer<TState> {
  /**
   * 类型守卫：检查是否为带有 __type 字段的对象
   */
  function isTypedObject(value: unknown): value is { __type: string; [key: string]: unknown } {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__type' in value &&
      typeof (value as { __type: unknown }).__type === 'string'
    );
  }

  /**
   * 递归序列化值
   */
  const serializeValue = (value: unknown): unknown => {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Map) {
      return {
        __type: 'Map',
        entries: Array.from(value.entries()).map(([k, v]) => [
          serializeValue(k),
          serializeValue(v),
        ]),
      };
    }

    if (value instanceof Set) {
      return {
        __type: 'Set',
        values: Array.from(value).map(serializeValue),
      };
    }

    if (value instanceof Date) {
      return {
        __type: 'Date',
        value: value.toISOString(),
      };
    }

    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = serializeValue(v);
      }
      return result;
    }

    return value;
  };

  /**
   * 递归反序列化值
   */
  const deserializeValue = (value: unknown): unknown => {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (isTypedObject(value) && value.__type === 'Map') {
      const entries = value.entries as Array<[unknown, unknown]>;
      return new Map(entries.map(([k, v]) => [deserializeValue(k), deserializeValue(v)]));
    }

    if (isTypedObject(value) && value.__type === 'Set') {
      const values = value.values as unknown[];
      return new Set(values.map(deserializeValue));
    }

    if (isTypedObject(value) && value.__type === 'Date') {
      return new Date(value.value as string);
    }

    if (Array.isArray(value)) {
      return value.map(deserializeValue);
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = deserializeValue(v);
    }
    return result;
  };

  return {
    serialize: (state: TState) => serializeValue(state),
    deserialize: (data: unknown) => deserializeValue(data) as TState,
  };
}
