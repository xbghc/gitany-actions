---
title: Core 工具库
---

# @gitany/core（核心工具库）

提供 GitAny 生态系统的核心功能和共享工具。

包路径：`packages/core`

## 功能

### Pull Request 监控

提供 PR 状态监控功能，可以实时监听 PR 的状态变化。

```ts
import { watchPullRequest } from '@gitany/core';
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// 监控 PR 状态变化
const unwatch = watchPullRequest(client, 'https://gitcode.com/owner/repo.git', {
  onOpen: (pr) => {
    console.log(`PR #${pr.number} 已打开: ${pr.title}`);
  },
  onClosed: (pr) => {
    console.log(`PR #${pr.number} 已关闭: ${pr.title}`);
  },
  onMerged: (pr) => {
    console.log(`PR #${pr.number} 已合并: ${pr.title}`);
  }
});

// 停止监控
// unwatch();
```

#### API

##### watchPullRequest(client, url, options)

监控指定仓库的 PR 状态变化。

**参数:**
- `client`: `GitcodeClient` 实例
- `url`: 仓库 URL
- `options`: 监控选项

**选项:**
- `onOpen`: PR 打开时触发
- `onClosed`: PR 关闭时触发
- `onMerged`: PR 合并时触发

**返回值:**
- 返回一个清理函数，调用可停止监控

## 工作原理

- 每隔 5 秒检查一次 PR 列表
- 检测 PR 状态变化（新建、关闭、合并）
- 自动触发相应的回调函数
- 使用 `client.pr.list()` 获取 PR 数据

## PR 构建容器

提供在隔离的 Docker 容器中构建和测试 PR 的能力。

```ts
import { runPrInContainer, resetPrContainer, removePrContainer } from '@gitany/core';
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();
const pr = await client.pr.get('https://gitcode.com/owner/repo.git', 1);

// 在默认 node:20 镜像中执行构建
await runPrInContainer('https://gitcode.com/owner/repo.git', pr);

// 自定义镜像和脚本
await runPrInContainer('https://gitcode.com/owner/repo.git', pr, {
  image: 'node:20',
  script: 'pnpm lint && pnpm build',
});

// 重新创建或删除容器
await resetPrContainer('https://gitcode.com/owner/repo.git', pr);
await removePrContainer(pr.id);
```

容器内可访问以下环境变量：

- `PR_BASE_REPO_URL`、`PR_HEAD_REPO_URL`
- `PR_BASE_SHA`、`PR_HEAD_SHA`

默认脚本会克隆基仓库、添加 head 远程并检出 PR 提交，然后执行 `pnpm install`、`pnpm build`、`pnpm test`。

