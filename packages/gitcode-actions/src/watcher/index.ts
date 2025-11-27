import { GitCodeClient } from '@xbghc/gitcode-api';
import type { WatchOptions } from './types.js';
import { Watcher } from './watcher.js';

/**
 * 创建仓库监听器
 *
 * @param client - GitCode 客户端
 * @param url - 仓库 URL
 * @param options - 监听配置
 * @returns Watcher 实例
 *
 * @example
 * ```typescript
 * import { watch } from '@xbghc/gitcode-actions';
 *
 * const watcher = watch(client, 'https://gitcode.com/owner/repo', {
 *   pr: true,
 *   issue: true,
 * })
 *   .on('pr:opened', ({ pr }) => console.log(`新 PR: ${pr.title}`))
 *   .on('issue:comment:created', ({ issue, comment }) => {
 *     console.log(`Issue #${issue.number} 新评论`);
 *   })
 *   .start();
 * ```
 */
export function watch(client: GitCodeClient, url: string, options: WatchOptions = {}): Watcher {
  return new Watcher(client, url, options);
}

// 导出类型
export { FileStateStorage } from './file-state-storage.js';
export type { StateStorage } from './state-storage.js';
export type { Watcher, WatcherStatus, WatchOptions } from './types.js';
