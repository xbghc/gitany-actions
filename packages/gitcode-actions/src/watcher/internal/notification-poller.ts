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
    const query: {
      type: 'referer';
      unread: true;
      since?: string;
    } = {
      type: 'referer',
      unread: true,
    };

    if (useSinceParam && state.lastPollTime) {
      query.since = state.lastPollTime.toISOString();
    }

    const response: NotificationsResponse = await client.repo.getNotifications(owner, repo, query);

    for (const notification of response.list) {
      emit('notification:detected', {
        notification,
        owner,
        repo,
      });
    }

    return {
      lastPollTime: new Date(),
    };
  } catch (error) {
    emit('notification:poll:failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      owner,
      repo,
    });

    return state;
  }
}
