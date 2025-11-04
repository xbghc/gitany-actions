import { resolveRepoUrl } from '../../utils/resolve-repo-url.js';
import { withClient } from '../../utils/with-client.js';
import { parseGitUrl } from '@xbghc/gitcode-api';

interface MarkReadOptions {
  json?: boolean;
}

export async function markNotificationsReadCommand(
  urlOrFirstId: string,
  idsOrEmpty: string[],
  options: MarkReadOptions = {},
): Promise<void> {
  await withClient(async (client) => {
    let repoUrl: string;
    let ids: string[];

    // 判断第一个参数是 URL 还是 ID
    // 如果第一个参数看起来像 URL（包含 :// 或 .git），则作为 URL 处理
    if (urlOrFirstId.includes('://') || urlOrFirstId.endsWith('.git')) {
      repoUrl = urlOrFirstId;
      ids = idsOrEmpty;
    } else {
      // 否则第一个参数是 ID，从 git config 读取 URL
      repoUrl = await resolveRepoUrl(undefined);
      ids = [urlOrFirstId, ...idsOrEmpty];
    }

    if (ids.length === 0) {
      console.error('错误: 请提供至少一个通知 ID');
      process.exit(1);
    }

    const parsed = parseGitUrl(repoUrl);

    if (!parsed) {
      console.error('无法解析仓库 URL:', repoUrl);
      process.exit(1);
    }

    const { owner, repo } = parsed;

    // 用逗号连接所有 ID
    const idsString = ids.join(',');

    await client.repo.markNotificationsRead(owner, repo, { ids: idsString });

    if (options.json) {
      console.log(JSON.stringify({ success: true, marked: ids.length }, null, 2));
    } else {
      console.log(`✅ 已成功标记 ${ids.length} 条通知为已读`);
      console.log(`通知 ID: ${idsString}`);
    }
  }, 'Failed to mark notifications as read');
}
