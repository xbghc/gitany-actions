---
title: GitCode Actions 工具库
---

# @xbghc/gitcode-actions（GitCode Actions 工具库）

提供 GitCode 平台的自动化工作流、容器编排以及 AI 评论助手等能力。

包路径：`packages/gitcode-actions`

主要能力分为三大类：

- **事件监听器**：统一的 `Watcher` 类可持续轮询仓库的 PR 和 Issue 事件并通过 EventEmitter 触发回调。
- **容器与构建工具**：`createPrContainer`、`testShaBuild`、`chat` 等帮助在隔离环境中执行构建或对话任务。`chat` 现使用 Anthropic SDK 直接调用 Claude API，性能显著提升（<1秒响应，<50MB内存）。
- **AI 评论助手**：`watchMentions`/`runMentionsOnce` 监听 `@AI` 等提及并自动生成回复（已废弃，建议使用个人通知 API）。

## 统一 Watcher API

从 2.0 版本开始，GitCode Actions 采用统一的 `Watcher` 类来监控 PR 和 Issue 事件，替代了之前的 `watchPullRequest()` 和 `watchIssues()` 函数。新架构基于配置驱动和 EventEmitter 模式，提供更灵活的事件监听能力。

### 核心概念

**Watcher 类**：统一的事件监控器，通过配置决定监控哪些资源（PR、Issue）。

**EventEmitter 模式**：使用 `.on(eventName, handler)` 监听事件，而非回调函数。

**配置驱动**：通过 `options` 参数控制监控行为，支持 `pr`、`issue`、`mention` 三种资源类型。

### 基本用法

```ts
import { Watcher } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 创建 Watcher 实例
const watcher = new Watcher(client, 'https://gitcode.com/owner/repo.git', {
  pr: {
    intervalSec: 10,
    commentType: 'pr_comment', // 可选：'pr_comment' | 'diff_comment'
  },
  issue: {
    intervalSec: 10,
    issueQuery: { state: 'open' },
    commentQuery: { per_page: 20 },
  },
});

// 监听 PR 事件
watcher.on('pr:opened', (pr) => {
  console.log(`PR #${pr.number} 已打开: ${pr.title}`);
});

watcher.on('pr:closed', (pr) => {
  console.log(`PR #${pr.number} 已关闭`);
});

watcher.on('pr:merged', (pr) => {
  console.log(`PR #${pr.number} 已合并`);
});

watcher.on('pr:comment:created', ({ pr, comment }) => {
  console.log(`PR #${pr.number} 有新评论: ${comment.body}`);
});

// 监听 Issue 事件
watcher.on('issue:comment:created', ({ issue, comment }) => {
  console.log(`Issue #${issue.number} 有新评论: ${comment.body}`);
});

// 启动监控
watcher.start();

// 停止监控
// watcher.stop();

// 手动触发一次检查
// await watcher.runOnce();

// 清除状态（重新开始监控）
// await watcher.clearState();
```

### Watcher API

#### 构造函数

```ts
new Watcher(client: GitcodeClient, repoUrl: string, options?: WatchOptions)
```

**参数**：
- `client`: GitcodeClient 实例
- `repoUrl`: 仓库 URL
- `options`: 监控选项（可选）
  - `pr`: PR 监控配置
    - `intervalSec`: 检查间隔（秒），默认 5
    - `commentType`: 评论类型过滤，可选 `'pr_comment'` 或 `'diff_comment'`
  - `issue`: Issue 监控配置
    - `intervalSec`: 检查间隔（秒），默认 5
    - `issueQuery`: Issue 查询参数
    - `commentQuery`: 评论查询参数
  - `mention`: AI 提及监控配置（已废弃）

#### 方法

- `start()`: 启动后台周期性监控
- `stop()`: 停止后台监控
- `runOnce()`: 手动执行一次检查（不启动后台任务）
- `clearState()`: 清除持久化状态，重新开始监控

#### 事件

**PR 事件**：
- `pr:opened`: PR 被打开时触发，回调参数：`(data: { pr, timestamp }) => void`
- `pr:closed`: PR 被关闭时触发，回调参数：`(data: { pr, timestamp }) => void`
- `pr:merged`: PR 被合并时触发，回调参数：`(data: { pr, timestamp }) => void`
- `pr:comment:created`: PR 有新评论时触发，回调参数：`(data: { pr, comment, timestamp }) => void`

**Issue 事件**：
- `issue:comment:created`: Issue 有新评论时触发，回调参数：`(data: { issue, comment, timestamp }) => void`

**容器事件**：
- `container:created`: 容器创建时触发，回调参数：`(data: { container, pr, timestamp }) => void`
- `container:removed`: 容器删除时触发，回调参数：`(data: { prId, timestamp }) => void`

**Mention 事件**（已废弃）：
- `mention:found`: 检测到 AI 提及时触发
- `mention:reply`: AI 回复成功时触发

### 状态持久化

Watcher 会自动将监控状态保存到本地文件系统，避免重复触发事件：

- PR 状态：`~/.gitcode/watchers/prs/*.json`
- Issue 状态：`~/.gitcode/watchers/issues/*.json`

当进程重启后，Watcher 会从上次的状态继续监控，不会重复处理历史事件。

## 功能

### Pull Request 监控

使用统一的 `Watcher` 类监控 PR 状态和评论，可以实时监听 PR 的状态变化和评论。

```ts
import { Watcher } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 创建 Watcher 实例，配置 PR 监控
const watcher = new Watcher(client, 'https://gitcode.com/owner/repo.git', {
  pr: {
    intervalSec: 10, // 每10秒检查一次
    commentType: 'pr_comment', // 可选：仅监听 PR 评论（不含 diff 评论）
  },
});

// 监听 PR 事件
watcher.on('pr:opened', (pr) => {
  console.log(`PR #${pr.number} 已打开: ${pr.title}`);
});

watcher.on('pr:closed', (pr) => {
  console.log(`PR #${pr.number} 已关闭: ${pr.title}`);
});

watcher.on('pr:merged', (pr) => {
  console.log(`PR #${pr.number} 已合并: ${pr.title}`);
});

watcher.on('pr:comment:created', ({ pr, comment }) => {
  console.log(`PR #${pr.number} 有新评论: ${comment.body}`);
});

// 启动后台周期性监控
watcher.start();

// 在需要时停止
// watcher.stop();

// 您也可以按需手动触发一次检查，这不会启动后台定时器
// await watcher.runOnce();
```

#### 配置选项

**PR 监控配置** (`options.pr`):

- `intervalSec`: 检查间隔时间（秒），默认为 5
- `commentType`: 仅监听指定类型的评论
  - `'pr_comment'`: 仅监听 PR 评论
  - `'diff_comment'`: 仅监听 diff 评论
  - 不指定：同时监听两种类型

#### 可用事件

- `pr:opened`: PR 打开时触发，回调参数：`(data: { pr, timestamp }) => void`
- `pr:closed`: PR 关闭时触发，回调参数：`(data: { pr, timestamp }) => void`
- `pr:merged`: PR 合并时触发，回调参数：`(data: { pr, timestamp }) => void`
- `pr:comment:created`: PR 有新评论时触发，回调参数：`(data: { pr, comment, timestamp }) => void`

#### 状态持久化

监视器的状态会持久化到 `~/.gitcode/watchers/prs/*.json`，便于在进程重启后延续最近一次的基线数据。可调用 `runOnce()` 进行单次轮询，或 `stop()` 停止后台定时任务。

### Issue 评论监控

使用统一的 `Watcher` 类监控 Issue 评论。当监听到新的评论时会触发事件，默认每 5 秒检测一次。

```ts
import { Watcher } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 创建 Watcher 实例，配置 Issue 监控
const watcher = new Watcher(client, 'https://gitcode.com/owner/repo.git', {
  issue: {
    intervalSec: 10,
    issueQuery: { state: 'open', per_page: 20 },
    commentQuery: { per_page: 50 },
  },
});

// 监听 Issue 评论事件
watcher.on('issue:comment:created', ({ issue, comment }) => {
  console.log(`Issue #${issue.number} 有新评论: ${comment.body}`);
});

// 启动后台周期性监控
watcher.start();

// 在需要时停止
// watcher.stop();

// 同样地，您也可以手动触发一次检查
// await watcher.runOnce();
```

#### 配置选项

**Issue 监控配置** (`options.issue`):

- `intervalSec`: 检查间隔时间（秒），默认为 5
- `issueQuery`: Issue 查询参数，用于控制拉取哪些 Issue
  - `state`: Issue 状态，如 `'open'`、`'closed'` 或 `'all'`
  - `per_page`: 每页返回的 Issue 数量
  - 其他 GitCode API 支持的查询参数
- `commentQuery`: 评论查询参数，用于控制拉取评论的范围
  - `per_page`: 每页返回的评论数量
  - 其他 GitCode API 支持的查询参数

#### 可用事件

- `issue:comment:created`: Issue 有新评论时触发，回调参数：`(data: { issue, comment, timestamp }) => void`

#### 状态持久化

监视器会把最后一次看到的评论 ID 保存在 `~/.gitcode/watchers/issues/*.json` 中，避免重复触发事件。`runOnce()` 可在不启动后台定时任务的情况下执行一次检测。

### AI 评论助手

> ⚠️ **已废弃 (Deprecated)**
>
> `watchMentions` 和 `runMentionsOnce` 功能已标记为废弃，建议迁移至 GitCode 个人通知 API 实现类似功能。
>
> 该功能将在未来版本中移除。

`watchMentions` 会同时监听 Issue 评论与 PR 评论。当新增评论中包含指定标记（默认为 `@AI`）时，会收集 Issue 标题、描述、历史评论等上下文，并通过 Docker 容器中的 Anthropic SDK 直接调用 Claude API。相比旧版 Claude CLI 方式，响应速度从 30-60 秒降至 <1 秒。当 AI 调用成功且生成了内容时，会自动在对应的 Issue 或 PR 下创建回复评论。

若只需在脚本中执行一次检测与回复，可使用 `runMentionsOnce`，它会串行执行一次 Issue/PR 轮询并立即处理所有检测到的提及。

```ts
import { watchMentions } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

const aiWatcher = watchMentions(client, 'https://gitcode.com/owner/repo.git', {
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
- `chatOptions`: 传给 `chat` 的选项，包括：
  - 容器选项：`sha`、`keepContainer`、`nodeVersion` 等
  - Claude API 参数：`model`（默认 `claude-sonnet-4-5-20250929`）、`maxTokens`（默认 `8000`）、`temperature`
- `chatExecutor`: 自定义 chat 执行器，默认使用内置 `chat`
- `includeIssueComments` / `includePullRequestComments`: 控制监听的评论类型
- `replyWithComment`: 是否自动在 Issue/PR 下回复评论，默认 `true`
- `buildReplyBody(result, context)`: 自定义回复内容
- `onReplyCreated(reply, context)`: AI 回复成功创建时的回调
- `onReplyError(error, context)`: AI 回复失败时的回调

若只希望监听但不自动回复，可设置 `replyWithComment: false`；如需对回复内容进行包装，例如附带原评论引用，可通过 `buildReplyBody` 返回自定义文本。

默认提示语（`defaultPromptBuilder`）会包含仓库、Issue/PR 与评论上下文，并明确要求 AI 使用中文进行回复。

AI 监听器内部使用统一的 `Watcher` 类，同样会在 `~/.gitcode/watchers` 下持久化基线数据，避免重复处理历史评论。

## PR 监控工作原理

- 按指定间隔检查 PR 列表（默认 5 秒）
- 检测 PR 状态变化（新建、关闭、合并）
- 监控 PR 评论（仅对打开的 PR）
- 自动触发相应的回调函数
- 使用 `client.pr.list()` 获取 PR 数据

## 容器与构建工具

提供在隔离的 Docker 容器中构建和测试 PR、通过 Anthropic SDK 运行 Claude API 对话、验证提交可构建性的能力。

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

当需要自动响应 PR 的打开和关闭事件时，可在 Watcher 中启用容器管理：

```ts
import { Watcher } from '@xbghc/gitcode-actions';
import { GitcodeClient } from '@xbghc/gitcode-api';

const client = new GitcodeClient();

// 创建 Watcher 实例，启用容器管理
const watcher = new Watcher(client, 'https://gitcode.com/owner/repo.git', {
  pr: {
    container: {}, // 启用容器管理，PR 打开时创建容器，关闭或合并时删除容器
  },
});

// 监听容器事件
watcher.on('container:created', ({ container, pr }) => {
  console.log(`为 PR #${pr.number} 创建的容器已就绪: ${container.id}`);
});

watcher.on('container:removed', ({ prId }) => {
  console.log(`PR #${prId} 的容器已删除`);
});

// 启动监控
watcher.start();

// 根据 PR ID 获取对应的 Docker 容器
const container = watcher.getContainers().get(123);
if (container) {
  console.log('找到了 PR #123 对应的容器:', container.id);
}

// 停止监控
// watcher.stop();
```

**容器配置选项** (`options.pr.container`):

可以传入 `ContainerOptions` 对象来自定义容器行为：
- `image`: 容器镜像，默认为 Node.js 镜像
- `env`: 额外的环境变量
- `autoRemove`: 是否自动删除容器，默认根据 PR 状态决定
- 传入 `false` 可完全禁用容器管理

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

- `installAnthropicSdk(options)`: 在容器中安装 Anthropic SDK（用于 `chat` 功能）。
- `installCli({ name, script, ... })`: 统一的安装入口，可自定义安装脚本与名称。

所有安装工具都会复用 `executeStep`，并支持传入额外环境变量 (`env`) 与 `verbose` 日志输出。

### 通过 Anthropic SDK 进行 AI 对话

`chat(repoUrl, question, options)` 会在 Docker 容器中克隆项目、安装依赖与 Anthropic SDK，
并通过 Node.js 脚本直接调用 Claude API。相比旧版 Claude CLI 实现，性能显著提升：

- **启动时间**: 30-60 秒 → <1 秒
- **内存占用**: ~500MB → <50MB
- **响应速度**: 显著加快
- **返回信息**: 包含 token 使用统计等元数据

```ts
import { chat } from '@xbghc/gitcode-actions';

// 基础使用（需要设置 ANTHROPIC_API_KEY 环境变量）
const result = await chat(
  'https://gitcode.com/owner/repo.git',
  '请解释这个项目的结构'
);

if (result.success) {
  console.log('AI 回复:', result.output);
  console.log('Token 使用:', result.metadata.tokensUsed);
  console.log('模型:', result.metadata.model);
} else {
  console.error('错误:', result.error);
}

// 自定义参数
const result2 = await chat(repoUrl, prompt, {
  // 容器选项
  sha: 'main',              // 目标提交或分支，默认 'dev'
  keepContainer: false,     // 是否保留容器，默认 false
  nodeVersion: '22',        // Node.js 版本，默认 '18'
  verbose: true,            // 输出详细日志

  // Claude API 参数
  model: 'claude-sonnet-4-5-20250929',  // Claude 模型
  maxTokens: 16000,                     // 最大 token 数，默认 8000
  temperature: 0.7,                     // 温度参数，可选

  // 镜像源
  npmRegistry: 'https://registry.npmmirror.com',
  pnpmRegistry: 'https://registry.npmmirror.com',
});
```

**参数选项**:

容器相关：
- `sha`: 目标提交或分支，默认 `dev`
- `container`: 传入已有容器以复用，否则自动创建临时容器
- `nodeVersion`: 自动创建容器时使用的 Node.js 版本，默认 `18`
- `keepContainer`: 创建的临时容器是否保留，默认 `false`
- `verbose`: 是否输出调试日志
- `npmRegistry` / `pnpmRegistry`: 自定义依赖安装时使用的镜像源

Claude API 相关：
- `model`: Claude 模型名称，默认 `claude-sonnet-4-5-20250929`
- `maxTokens`: 最大生成 token 数，默认 `8000`
- `temperature`: 温度参数（0-1），控制创造性，可选

**返回值 `ChatResult`**:

```typescript
interface ChatResult {
  success: boolean;          // 是否成功
  output?: string;           // AI 回复内容（成功时）
  error?: string;            // 错误信息（失败时）
  metadata?: {               // 元数据（成功时）
    model: string;           // 使用的模型
    tokensUsed: number;      // 总 token 使用量
    inputTokens: number;     // 输入 token 数
    outputTokens: number;    // 输出 token 数
  };
}
```

**环境变量要求**:

调用过程中会自动转发宿主机上所有以 `ANTHROPIC_` 开头的环境变量。必须设置：

```bash
export ANTHROPIC_API_KEY=sk-ant-xxx
```

**容器复用**:

当 `sha` 为 `dev` 且未显式传入容器时，会尝试复用共享的开发容器，以加快后续调用速度。
