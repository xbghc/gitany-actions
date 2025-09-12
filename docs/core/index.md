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
import {
  runPrInContainer,
  resetPrContainer,
  removePrContainer,
  getPrContainerStatus,
  getPrContainerOutput,
} from '@gitany/core';
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();
// 获取打开的 PR 列表并选择第一个
const [pr] = await client.pr.list('https://gitcode.com/owner/repo.git', {
  state: 'open',
});

// 在默认 node:20 镜像中执行构建
const { exitCode, output } = await runPrInContainer('https://gitcode.com/owner/repo.git', pr);
console.log(exitCode, output);

// 查询容器状态和最近输出
console.log(await getPrContainerStatus(pr.id));
console.log(getPrContainerOutput(pr.id));

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

- 若设置，所有以 `ANTHROPIC_` 开头的 Claude 相关变量都会被转发

这些变量提供了构建和修改所需的全部信息。容器不会挂载宿主机目录，默认在 `/tmp/workspace` 下克隆代码并执行脚本，不会影响本地文件。若 Docker 守护进程不可用，`runPrInContainer` 会抛出 `Docker daemon is not available` 错误。函数返回值包含脚本的退出码与输出，主程序也可通过 `getPrContainerStatus(pr.id)` 和 `getPrContainerOutput(pr.id)` 查询容器状态与最近一次执行日志。

默认脚本会克隆基仓库、添加 head 远程并检出 PR 提交，然后执行 `pnpm install`、`pnpm build`、`pnpm test`。

### 使用 Claude Code 修改并提交 PR

借助转发的 `ANTHROPIC_AUTH_TOKEN` 等环境变量，可以在容器脚本中直接调用 `claude code` 对代码进行编辑并推送提交：

```ts
await runPrInContainer('https://gitcode.com/owner/repo.git', pr, {
  script: [
    'corepack enable',
    'git config user.name "bot"',
    'git config user.email "bot@example.com"',
    'claude code --apply "将 README 翻译为中文"',
    'git commit -am "docs: translate readme"',
    'git push head HEAD:translate-readme',
  ].join(' && '),
});
```

上述脚本在容器中运行 `claude code` 自动修改工作区，并通过 `git` 命令提交并推送到 PR 分支。
