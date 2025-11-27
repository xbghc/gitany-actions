import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import superjson, { type SuperJSONResult, type SuperJSONValue } from 'superjson';
import { ensureDir } from '../utils/index.js';
import type { StateStorage } from './state-storage.js';

/**
 * 基于文件系统的状态存储实现
 *
 * 将状态保存到 ~/.gitcode/repos/{owner-repo}/{watcherType}.json
 *
 * 通过将泛型约束为 `SuperJSONValue`，在编译期即可保证传入状态可被 SuperJSON
 * 安全序列化（支持 Map/Set/Date 等），避免运行时再依赖类型断言。
 */
export class FileStateStorage<TState extends SuperJSONValue = SuperJSONValue>
  implements StateStorage<TState>
{
  private readonly watcherType: string;

  /**
   * @param watcherType - Watcher 类型（如 'pr', 'issue'）
   */
  constructor(watcherType: string) {
    this.watcherType = watcherType;
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
   * - 通过 superjson 自动还原 Map/Set/Date 等类型
   */
  load(key: string): TState | undefined {
    try {
      const filePath = this.getFilePath(key);

      if (!fsSync.existsSync(filePath)) {
        return undefined;
      }

      const raw = fsSync.readFileSync(filePath, 'utf8');
      if (!raw) {
        return undefined;
      }

      const json = JSON.parse(raw) as SuperJSONResult;

      return superjson.deserialize<TState>(json);
    } catch {
      return undefined;
    }
  }

  /**
   * 异步保存状态
   *
   * @remarks
   * - 自动创建目录（如果不存在）
   * - 如果写入失败，抛出错误
   * - 通过 superjson 自动转换 Map/Set/Date 等类型
   */
  async save(key: string, state: TState): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    await ensureDir(dir);

    const data = superjson.serialize(state);

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
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
