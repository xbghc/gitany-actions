import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir } from '../utils/index.js';
import type { StateStorage } from './state-storage.js';
import { createSmartSerializer, type StateSerializer } from './state-serializer.js';

/**
 * 基于文件系统的状态存储实现
 *
 * 将状态保存到 ~/.gitcode/repos/{owner-repo}/{watcherType}.json
 */
export class FileStateStorage<TState = unknown> implements StateStorage<TState> {
  private readonly watcherType: string;
  private readonly serializer: StateSerializer<TState>;

  /**
   * @param watcherType - Watcher 类型（如 'pr', 'issue'）
   * @param serializer - 状态序列化器（默认使用智能序列化器）
   */
  constructor(watcherType: string, serializer: StateSerializer<TState> = createSmartSerializer()) {
    this.watcherType = watcherType;
    this.serializer = serializer;
  }

  /**
   * 获取完整的文件路径
   * @param key - 仓库目录路径（如 ~/.gitcode/repos/owner-repo）
   */
  private getFilePath(key: string): string {
    return path.join(key, `${this.watcherType}.json`);
  }

  /**
   * 同步加载状态
   *
   * @remarks
   * - 如果文件不存在，返回 undefined
   * - 如果解析失败，返回 undefined（不抛出错误）
   * - 使用 serializer 自动还原 Map/Set/Date 等类型
   */
  load(key: string): TState | undefined {
    try {
      const filePath = this.getFilePath(key);

      // 检查文件是否存在
      if (!fsSync.existsSync(filePath)) {
        return undefined;
      }

      // 读取并解析 JSON
      const raw = fsSync.readFileSync(filePath, 'utf8');
      if (!raw) {
        return undefined;
      }

      const json = JSON.parse(raw);

      // 使用 serializer 反序列化
      return this.serializer.deserialize(json);
    } catch {
      // 解析失败或读取失败，返回 undefined
      // 错误处理由 BaseWatcher 负责（会触发事件）
      return undefined;
    }
  }

  /**
   * 异步保存状态
   *
   * @remarks
   * - 自动创建目录（如果不存在）
   * - 如果写入失败，抛出错误
   * - 使用 serializer 自动转换 Map/Set/Date 等类型
   */
  async save(key: string, state: TState): Promise<void> {
    // 确保目录存在
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    await ensureDir(dir);

    // 使用 serializer 序列化
    const data = this.serializer.serialize(state);

    // 写入文件（格式化 JSON 便于调试）
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, 'utf8');
  }

  /**
   * 删除状态文件
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // 忽略文件不存在的错误
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
