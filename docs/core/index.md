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
const unwatch = watchPullRequest(client, 'https://gitcode.com/owner/repo.git', {
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
  intervalMs: 10000 // 每10秒检查一次
});

// 停止监控
// unwatch();
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
- `intervalMs`: 检查间隔时间（毫秒），默认为 5000

**返回值:**
- 返回一个清理函数，调用可停止监控

## 工作原理

- 按指定间隔检查 PR 列表（默认 5 秒）
- 检测 PR 状态变化（新建、关闭、合并）
- 监控 PR 评论（仅对打开的 PR）
- 自动触发相应的回调函数
- 使用 `client.pr.list()` 获取 PR 数据
- 使用 `client.pr.comments()` 获取评论数据

### Claude AI 集成

提供与 Claude AI 交互的功能，可以发送消息并获得回复。

```ts
import { askClaude } from '@gitany/core';

const response = await askClaude(
  '请帮我优化这段代码',
  '/path/to/project',
  {
    permissions: ['read', 'write'],
    anthropicModel: 'claude-3-5-sonnet-20241022',
    apiTimeoutMs: 30000
  }
);

console.log(response);
```

#### API

##### askClaude(msg, cwd, options?)

发送消息给 Claude AI 并获得回复。

**参数:**
- `msg`: 要发送的消息
- `cwd`: 工作目录路径
- `options`: 配置选项

**选项:**
- `permissions`: 允许的工具权限数组
- `anthropicBaseUrl`: Anthropic API 基础 URL
- `anthropicAuthToken`: Anthropic 认证令牌（必需）
- `apiTimeoutMs`: API 超时时间（毫秒），默认 60000
- `anthropicModel`: 使用的模型
- `anthropicSmallFastModel`: 小型快速模型
- `disableNonessentialTraffic`: 是否禁用非必要流量

**环境变量:**
- `ANTHROPIC_BASE_URL`: API 基础 URL
- `ANTHROPIC_AUTH_TOKEN`: 认证令牌
- `API_TIMEOUT_MS`: 超时时间
- `ANTHROPIC_MODEL`: 默认模型
- `ANTHROPIC_SMALL_FAST_MODEL`: 小型快速模型
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`: 禁用非必要流量

**返回值:**
- 返回 Claude 的回复文本

**注意:**
- 需要系统中安装 `claude` 命令行工具
- 必须提供 `anthropicAuthToken` 参数或设置 `ANTHROPIC_AUTH_TOKEN` 环境变量