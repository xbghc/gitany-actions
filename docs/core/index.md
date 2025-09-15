---
title: Core 工具库
---

# @gitany/core（核心工具库）

提供 GitAny 生态系统的核心功能和共享工具。

包路径：`packages/core`

## 功能

### Pull Request 监控

提供 PR 状态和评论监控功能，可以实时监听 PR 的状态变化和评论。

```ts
import { watchPullRequest } from '@gitany/core';
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// 监控 PR 状态变化和评论
const watcher = watchPullRequest(client, 'https://gitcode.com/owner/repo.git', {
  onOpen: (pr) => {
    console.log(`PR #${pr.number} 已打开: ${pr.title}`);
  },
  onClosed: (pr) => {
    console.log(`PR #${pr.number} 已关闭: ${pr.title}`);
  },
  onMerged: (pr) => {
    console.log(`PR #${pr.number} 已合并: ${pr.title}`);
  },
  onComment: (pr, comment) => {
    console.log(`PR #${pr.number} 有新评论: ${comment.body}`);
  },
  intervalSec: 10 // 每10秒检查一次
});

// 停止监控
// watcher.stop();
```

#### API

##### watchPullRequest(client, url, options)

监控指定仓库的 PR 状态变化和评论。

**参数:**
- `client`: `GitcodeClient` 实例
- `url`: 仓库 URL
- `options`: 监控选项

**选项:**
- `onOpen`: PR 打开时触发
- `onClosed`: PR 关闭时触发
- `onMerged`: PR 合并时触发
- `onComment`: PR 有新评论时触发
- `intervalSec`: 检查间隔时间（秒），默认为 5
- `container`: 传入对象以启用内置容器管理（传 `false` 禁用）
- `onContainerCreated`: 容器创建后触发
- `onContainerRemoved`: 容器删除后触发

**返回值:**
- 返回一个句柄 `{ stop(), containers() }`

## 工作原理

- 按指定间隔检查 PR 列表（默认 5 秒）
- 检测 PR 状态变化（新建、关闭、合并）
- 监控 PR 评论（仅对打开的 PR）
- 自动触发相应的回调函数
- 使用 `client.pr.list()` 获取 PR 数据

## PR 构建容器

提供在隔离的 Docker 容器中构建和测试 PR 的能力。

```ts
import {
  createPrContainer,
  resetContainer,
  removeContainer,
  getContainer,
  getContainerStatus,
} from '@gitany/core';
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();
// 获取打开的 PR 列表并选择第一个
const [pr] = await client.pr.list('https://gitcode.com/owner/repo.git', {
  state: 'open',
});

// 手动创建并执行脚本
await createPrContainer('https://gitcode.com/owner/repo.git', pr);
const container = await getContainer({ pr: pr.id });
if (container) {
  const exec = await container.exec({
    Cmd: ['sh', '-lc', 'pnpm lint && pnpm build'],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  stream.on('data', (d) => process.stdout.write(d.toString()));
}

// 查询容器状态
console.log(await getContainerStatus(pr.id));

// 重新创建或删除容器
await resetContainer('https://gitcode.com/owner/repo.git', pr);
await removeContainer(pr.id);
```

#### 自动管理 PR 容器生命周期

当需要自动响应 PR 的打开和关闭事件时，可在 watcher 中直接启用容器管理：

```ts
import { watchPullRequest } from '@gitany/core';
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();

// 监控指定仓库的 PR，打开时创建容器，关闭或合并时删除容器
const watcher = watchPullRequest(client, 'https://gitcode.com/owner/repo.git', {
  container: {},
  onContainerCreated: (container, pr) => {
    console.log('容器已创建', container.id);
  }
});

// 根据 PR ID 获取对应的 Docker 容器
const container = watcher.containers().get(123);
console.log(container?.id);

// 停止监控
// watcher.stop();
```

容器内可访问以下环境变量：

- `PR_BASE_REPO_URL`、`PR_HEAD_REPO_URL`
- `PR_BASE_SHA`、`PR_HEAD_SHA`

- 若设置，所有以 `ANTHROPIC_` 开头的 Claude 相关变量都会被转发

这些变量提供了构建和修改所需的全部信息。容器不会挂载宿主机目录，需要自行在 `/tmp/workspace` 下克隆代码并执行脚本，不会影响本地文件。若 Docker 守护进程不可用，相关操作会抛出 `Docker daemon is not available` 错误。可通过 `getContainerStatus(pr.id)` 查询容器状态。

### 清理异常容器

若手动运行过程中出现异常容器（例如状态为 `exited`），可执行以下命令进行清理：

```bash
pnpm --filter @gitany/core cleanup
```

### 通过 Claude Code 进行对话

`chat(repoUrl, question, options)` 会在 Docker 容器中克隆项目、安装依赖与 Claude Code CLI，
并以无头模式向 Claude Code 提问。

```ts
import { chat } from '@gitany/core';

const result = await chat(
  'https://gitcode.com/owner/repo.git',
  'Explain the project structure',
);
console.log(result.output);
```

参数选项：

- `sha`: 目标提交或分支，默认 `dev`
- `container`: 传入已有容器以复用，否则自动创建临时容器
- `keepContainer`: 创建的临时容器是否保留，默认 `false`


