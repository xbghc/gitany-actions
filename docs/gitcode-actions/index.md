---
title: GitCode Actions 工具库
---

# @xbghc/gitcode-actions（GitCode Actions 工具库）

提供 GitCode 平台的自动化工作流、容器编排以及 AI 评论助手等能力。

包路径：`packages/gitcode-actions`

主要能力分为三大类：

- **事件监听器**：`watchPullRequest`、`watchIssues` 可持续轮询仓库事件并触发回调。
- **容器与构建工具**：`createPrContainer`、`testShaBuild`、`chat` 等帮助在隔离环境中执行构建或对话任务。
- **AI 评论助手**：`watchAiMentions`/`runAiMentionsOnce` 监听 `@AI` 等提及并自动生成回复。

## 功能

### Pull Request 监控

提供 PR 状态和评论监控功能，可以实时监听 PR 的状态变化和评论。

```ts
import { watchPullRequest } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 创建一个 PR 监视器实例
const prWatcher = watchPullRequest(client, 'https://gitcode.com/owner/repo.git', {
  onOpen: (pr) => console.log(`PR #${pr.number} 已打开: ${pr.title}`),
  onClosed: (pr) => console.log(`PR #${pr.number} 已关闭: ${pr.title}`),
  onMerged: (pr) => console.log(`PR #${pr.number} 已合并: ${pr.title}`),
  onComment: (pr, comment) => console.log(`PR #${pr.number} 有新评论: ${comment.body}`),
  intervalSec: 10, // 每10秒检查一次
});

// 如需启动后台周期性监控
prWatcher.start();

// 在需要时停止
// prWatcher.stop();

// 您也可以按需手动触发一次检查，这不会启动后台定时器
// await prWatcher.runOnce();
```

#### API

##### watchPullRequest(client, url, options)

创建一个用于监控指定仓库 PR 状态和评论的 `PullRequestWatcher` 实例。

**参数:**

- `client`: `GitcodeClient` 实例。
- `url`: 仓库 URL。
- `options`: 监控选项。

**选项:**

- `onOpen`: PR 打开时触发。
- `onClosed`: PR 关闭时触发。
- `onMerged`: PR 合并时触发。
- `onComment`: PR 有新评论时触发。
- `commentType`: 仅监听指定类型的评论，支持 `diff_comment` 与 `pr_comment`，默认同时监听。
- `intervalSec`: 检查间隔时间（秒），默认为 5。
- `container`: 传入对象以启用内置容器管理（传 `false` 禁用）。
- `onContainerCreated`: 容器创建后触发。
- `onContainerRemoved`: 容器删除后触发。

监视器的状态会持久化到 `~/.gitcode/watchers/prs/*.json`，便于在进程重启后延续最近一次的基线数据。可调用 `runOnce()` 进行单次轮询，或 `stop()` 停止后台定时任务。

`container` 对象支持 `image`、`env`、`autoRemove` 三个字段，对应 `ContainerOptions` 定义，可覆盖默认镜像或注入额外环境变量。

**返回值:**

- 返回一个 `PullRequestWatcher` 实例，该实例提供以下方法：
  - `runOnce(): Promise<void>`: 执行一次状态检查。
  - `start(): void`: 启动后台周期性检查。
  - `stop(): void`: 停止后台检查。
  - `getContainers(): Map<number, Docker.Container>`: 获取由监视器管理的容器实例映射。

### Issue 评论监控

`watchIssues` 可用于轮询仓库的 Issue 评论。当监听到新的评论时会触发回调，默认每 5 秒检测一次。

```ts
import { watchIssues } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 创建一个 Issue 监视器实例
const issueWatcher = watchIssues(client, 'https://gitcode.com/owner/repo.git', {
  onComment: (issue, comment) => {
    console.log(`Issue #${issue.number} 有新评论: ${comment.body}`);
  },
  intervalSec: 10,
});

// 启动后台周期性监控
issueWatcher.start();

// 在需要时停止
// issueWatcher.stop();

// 同样地，您也可以手动触发一次检查
// await issueWatcher.runOnce();
```

可通过 `issueQuery`/`commentQuery` 控制拉取范围，例如 `per_page`、`state` 等。默认 `intervalSec` 为 5 秒，可按需调整。

监视器会把最后一次看到的评论 ID 保存在 `~/.gitcode/watchers/issues/*.json` 中，避免重复触发回调。`runOnce()` 可在不启动后台定时任务的情况下执行一次检测。

### AI 评论助手

`watchAiMentions` 会同时监听 Issue 评论与 PR 评论。当新增评论中包含指定标记（默认为 `@AI`）时，会收集 Issue 标题、描述、历史评论等上下文，并将拼装后的提示语传入 `chat`。当 AI 调用成功且生成了内容时，会自动在对应的 Issue 或 PR 下创建回复评论。

若只需在脚本中执行一次检测与回复，可使用 `runAiMentionsOnce`，它会串行执行一次 Issue/PR 轮询并立即处理所有检测到的提及。

```ts
import { watchAiMentions } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

const aiWatcher = watchAiMentions(client, 'https://gitcode.com/owner/repo.git', {
  chatOptions: { sha: 'dev' },
  onChatResult: (result, context) => {
    if (result.success) {
      console.log('AI 输出:', result.output);
    } else {
      console.error('AI 调用失败:', result.error);
    }
  },
  onReplyCreated: (reply) => {
    console.log('AI 已回复评论，回复 ID:', reply.comment.id);
  },
});

// aiWatcher.stop();
```

可通过以下选项自定义行为：

- `mention`: 触发标记，默认 `@AI`
- `buildPrompt(context)`: 自定义提示语内容，可复用导出的 `defaultPromptBuilder`
- `issueIntervalSec` / `prIntervalSec`: Issue 与 PR 轮询频率
- `issueQuery` / `issueCommentQuery`: 控制轮询 Issue 及其评论的筛选条件
- `prCommentType`: 限定监听的 PR 评论类型（`diff_comment` 或 `pr_comment`）
- `chatOptions`: 传给 `chat` 的容器选项（如 `sha`、`keepContainer` 等）
- `chatExecutor`: 自定义 chat 执行器，默认使用内置 `chat`
- `includeIssueComments` / `includePullRequestComments`: 控制监听的评论类型
- `replyWithComment`: 是否自动在 Issue/PR 下回复评论，默认 `true`
- `buildReplyBody(result, context)`: 自定义回复内容
- `onReplyCreated(reply, context)`: AI 回复成功创建时的回调
- `onReplyError(error, context)`: AI 回复失败时的回调

若只希望监听但不自动回复，可设置 `replyWithComment: false`；如需对回复内容进行包装，例如附带原评论引用，可通过 `buildReplyBody` 返回自定义文本。

默认提示语（`defaultPromptBuilder`）会包含仓库、Issue/PR 与评论上下文，并明确要求 AI 使用中文进行回复。

AI 监听器内部复用 `watchIssues` 与 `watchPullRequest`，因此同样会在 `~/.gitcode/watchers` 下持久化基线数据，避免重复处理历史评论。

## PR 监控工作原理

- 按指定间隔检查 PR 列表（默认 5 秒）
- 检测 PR 状态变化（新建、关闭、合并）
- 监控 PR 评论（仅对打开的 PR）
- 自动触发相应的回调函数
- 使用 `client.pr.list()` 获取 PR 数据

## 容器与构建工具

提供在隔离的 Docker 容器中构建和测试 PR、运行 Claude Code 对话、验证提交可构建性的能力。

### PR 构建容器

```ts
import {
  createPrContainer,
  resetContainer,
  removeContainer,
  getContainer,
  getContainerStatus,
} from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

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
import { watchPullRequest } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 监控指定仓库的 PR，打开时创建容器，关闭或合并时删除容器
const prWatcher = watchPullRequest(client, 'https://gitcode.com/owner/repo.git', {
  container: {}, // 启用容器管理
  onContainerCreated: (container, pr) => {
    console.log(`为 PR #${pr.number} 创建的容器已就绪: ${container.id}`);
  },
});

// 启动监控
prWatcher.start();

// 根据 PR ID 获取对应的 Docker 容器
const container = prWatcher.getContainers().get(123);
if (container) {
  console.log('找到了 PR #123 对应的容器:', container.id);
}

// 停止监控
// prWatcher.stop();
```

容器内可访问以下环境变量：

- `PR_BASE_REPO_URL`、`PR_HEAD_REPO_URL`
- `PR_REPO_URL`（与 `PR_BASE_REPO_URL` 一致，便于脚本统一读取）
- `PR_BASE_SHA`、`PR_HEAD_SHA`

- 若设置，所有以 `ANTHROPIC_` 开头的 Claude 相关变量都会被转发

这些变量提供了构建和修改所需的全部信息。容器不会挂载宿主机目录，需要自行在 `/tmp/workspace` 下克隆代码并执行脚本，不会影响本地文件。若 Docker 守护进程不可用，相关操作会抛出 `Docker daemon is not available` 错误。可通过 `getContainerStatus(pr.id)` 查询容器状态。

### 清理异常容器

若手动运行过程中出现异常容器（例如状态为 `exited`），可执行以下命令进行清理：

```bash
pnpm --filter @xbghc/gitcode-actions cleanup
```

### 将宿主机文件复制到容器

`copyToContainer` 可将本地文件或目录打包后复制到指定容器目录中，并返回最终在容器内的路径。

```ts
import { copyToContainer } from '@xbghc/gitcode-actions';

const targetPath = await copyToContainer({
  container,
  srcPath: './artifacts/report.txt',
  containerPath: '/tmp/workspace/',
});

console.log('文件已复制到容器内:', targetPath);
```

使用说明：

- `containerPath` 以 `/` 结尾时，表示将文件或目录放入该目录下，并保留原文件名。
- 若需要重命名文件，可传入完整的目标路径，例如 `/tmp/workspace/output.log`。
- 目录同样支持复制，若希望重命名目录，可使用不带结尾 `/` 的路径（如 `/tmp/workspace/build-cache`）。
- 该方法会自动在容器中创建缺失的父目录，并在必要时执行重命名操作。
- 若复制过程中出现问题，会抛出 `CopyToContainerError` 以便上层捕获处理。

### testShaBuild：提交构建预检

`testShaBuild(repoUrl, sha, options)` 会按顺序在临时容器中执行克隆、校验 SHA、检出、项目诊断以及依赖安装，帮助在合并前快速判断某个提交是否具备构建条件。

```ts
import { testShaBuild } from '@xbghc/gitcode-actions';

const result = await testShaBuild('https://gitcode.com/owner/repo.git', 'main', {
  nodeVersion: '20',
  verbose: true,
});

if (!result.success) {
  console.error(result.error);
  console.dir(result.diagnostics, { depth: null });
}
```

预检流水线包含以下步骤：

1. `prepareImage`：拉取或复用指定版本的 Node.js 镜像。
2. `createWorkspaceContainer`：创建带有持久日志的工作容器。
3. `cloneRepo`：将仓库克隆至 `/tmp/workspace`。
4. `verifySha` 与 `checkoutSha`：确认目标提交/分支存在并检出。
5. `checkProjectFiles`：执行基础文件检查并通过 `collectDiagnostics` 解析 `package.json`、`pnpm-lock.yaml` 等信息。
6. `installDependencies`：使用 `corepack pnpm install` 安装依赖，内置 3 次指数退避重试。

`options` 支持：

- `nodeVersion`: 使用的 Node.js 镜像版本，默认 `18`。
- `verbose`: 输出容器执行过程的详细日志。
- `keepContainer`: 是否在结束后保留容器以便排查。

返回的 `TestShaBuildResult` 提供结构化诊断：

- `diagnostics.dockerAvailable`/`imagePullStatus`: 判断 Docker 是否可用以及镜像拉取状态。
- `diagnostics.repoAccessible`: 是否成功克隆仓库。
- `diagnostics.packageJsonExists`、`pnpmLockExists`、`isPnpmProject`: 项目元数据检查结果。
- `diagnostics.steps`: 每个步骤的耗时、成功状态与错误摘要。
- 若执行失败，`error` 字段会包含首个失败步骤的提示。

当输出为空导致诊断无法解析时，会抛出 `DiagnosticsCollectionError`；可捕获后追加上下文日志。

### 构建步骤工具

如需自定义流水线，可直接调用各个底层步骤：

- `prepareImage(options)`: 校验镜像是否存在，不存在则拉取，失败时会抛出 `ImagePullError`。
- `createWorkspaceContainer(options)`: 创建或复用带标签的工作容器，可通过 `reusable`、`repoUrl`、`branch` 在后续复用，异常时抛出 `ContainerCreationError`。
- `cloneRepo(options)`: 克隆仓库到 `/tmp/workspace`。
- `verifySha(options)`: 校验目标 SHA 是否存在；若失败会回退检测是否为分支名。
- `checkoutSha(options)`: 检出指定 SHA 或分支。
- `checkProjectFiles(options)`: 执行基础文件检测，返回 `ProjectCheckResult`（包含 `StepResult` 与 `ProjectDiagnostics`）。
- `collectDiagnostics(output)`: 解析步骤输出，判断是否为 pnpm 项目。
- `installDependencies(options)`: 根据项目的 `packageManager` 字段自动选择 pnpm 版本并进行安装，带指数退避重试。
- `executeStep(options)`: 在容器内执行任意脚本并返回 `StepResult`，失败时抛出 `StepExecutionError`。
- `cleanupPrContainers()`: 扫描并清理遗留的 PR 容器。

### 安装 CLI 工具

- `installClaudeCli(options)`: 在容器中全局安装 `@anthropic-ai/claude-code`。
- `installGitcodeCli(options)`: 将本地 `@xbghc/gitcode-cli` 打包后复制进容器并全局安装。
- `installCli({ name, script, ... })`: 统一的安装入口，可自定义安装脚本与名称。

所有安装工具都会复用 `executeStep`，并支持传入额外环境变量 (`env`) 与 `verbose` 日志输出。

### 通过 Claude Code 进行对话

`chat(repoUrl, question, options)` 会在 Docker 容器中克隆项目、安装依赖与 Claude Code CLI，
并以无头模式向 Claude Code 提问。

```ts
import { chat } from '@xbghc/gitcode-actions';

const result = await chat('https://gitcode.com/owner/repo.git', 'Explain the project structure');
console.log(result.output);
```

参数选项：

- `sha`: 目标提交或分支，默认 `dev`
- `container`: 传入已有容器以复用，否则自动创建临时容器
- `nodeVersion`: 自动创建容器时使用的 Node.js 版本，默认 `18`
- `keepContainer`: 创建的临时容器是否保留，默认 `false`
- `verbose`: 是否输出调试日志
- `npmRegistry` / `pnpmRegistry`: 自定义依赖安装时使用的镜像源

调用过程中会自动转发宿主机上所有以 `ANTHROPIC_` 开头的环境变量，以便 Claude Code 正确认证。函数返回 `ChatResult`，包含 `success`、`output`（成功时）与 `error`（失败时）等字段。当 `sha` 为 `dev` 且未显式传入容器时，会尝试复用共享的开发容器。
