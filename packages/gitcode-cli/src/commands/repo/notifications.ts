import { resolveGitCodeRepoUrl } from '../../utils/resolve-repo-url.js';
import { withClient } from '../../utils/with-client.js';
import { parseGitUrl, type NotificationQuery } from '@xbghc/gitcode-api';

interface NotificationsOptions extends NotificationQuery {
  json?: boolean;
  read?: boolean;
}

export async function notificationsCommand(
  url?: string,
  options: NotificationsOptions = {},
): Promise<void> {
  await withClient(async (client) => {
    const repoUrl = await resolveGitCodeRepoUrl(url);
    const parsed = parseGitUrl(repoUrl);

    if (!parsed) {
      console.error('无法解析仓库 URL:', repoUrl);
      process.exit(1);
    }

    const { owner, repo } = parsed;

    // 提取 NotificationQuery 参数
    const { json, read, ...query } = options;

    // 根据 --read 标志设置 unread 参数
    if (read) {
      // --read: 显示已读通知
      query.unread = false;
    } else if (query.unread === undefined) {
      // 默认：只显示未读通知
      query.unread = true;
    }

    const response = await client.repo.getNotifications(owner, repo, query);

    if (json) {
      // 输出完整 JSON
      console.log(JSON.stringify(response, null, 2));
    } else {
      // 格式化文本输出
      console.log(`\n📬 仓库通知 (${owner}/${repo})`);
      console.log(`总数: ${response.total}\n`);

      if (response.list.length === 0) {
        console.log('暂无通知');
        return;
      }

      response.list.forEach((notification, index) => {
        const unreadBadge = notification.unread ? '🔴 未读' : '✅ 已读';
        console.log(`${index + 1}. ${unreadBadge} [${notification.type}]`);
        console.log(`   ${notification.content}`);
        console.log(`   触发者: ${notification.actor.name} (@${notification.actor.login})`);
        console.log(`   时间: ${notification.update_at}`);
        console.log(`   链接: ${notification.html_url}`);
        console.log('');
      });
    }
  }, 'Failed to get notifications');
}
