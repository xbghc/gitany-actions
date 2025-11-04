import type { NotificationsResponse } from '@xbghc/gitcode-api';
import { parseGitUrl } from '@xbghc/gitcode-api';
import type { EmitFn, PollContext } from './resource-runner.js';

/**
 * Notification 轮询状态
 */
export interface NotificationState {
  /**
   * 上次轮询时间（可选，用于 since 参数优化）
   */
  lastPollTime?: Date;
}

/**
 * Notification 轮询选项
 */
export interface NotificationPollerOptions {
  /**
   * 是否使用 since 参数优化查询
   * @default true
   */
  useSinceParam?: boolean;
}

/**
 * 轮询仓库的通知（type='referer'）
 *
 * @param state - 当前轮询状态
 * @param context - 轮询上下文（包含 client、owner、repo）
 * @param emit - 事件发射函数
 * @param options - 轮询选项
 * @returns 更新后的状态
 */
export async function pollNotifications(
  state: NotificationState,
  context: PollContext,
  emit: EmitFn,
  options: NotificationPollerOptions = {},
): Promise<NotificationState> {
  const { client, url } = context;
  const { useSinceParam = true } = options;

  const parsed = parseGitUrl(url);
  if (!parsed) {
    throw new Error(`Invalid repo URL: ${url}`);
  }
  const { owner, repo } = parsed;

  try {
    // 构建查询参数
    const query: {
      type: 'referer';
      unread: true;
      since?: string;
    } = {
      type: 'referer',
      unread: true,
    };

    // 如果启用 since 参数且有上次轮询时间，使用它优化查询
    if (useSinceParam && state.lastPollTime) {
      query.since = state.lastPollTime.toISOString();
    }

    // 获取未读的通知
    const response: NotificationsResponse = await client.repo.getNotifications(owner, repo, query);

    // 发射所有未读通知的事件
    for (const notification of response.list) {
      emit('notification:detected', {
        notification,
        owner,
        repo,
      });
    }

    // 返回更新后的状态
    return {
      lastPollTime: new Date(),
    };
  } catch (error) {
    // 发射错误事件
    emit('notification:poll:failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      owner,
      repo,
    });

    // 返回原状态
    return state;
  }
}
