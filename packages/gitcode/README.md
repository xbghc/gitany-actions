# @gitany/gitcode

GitCode API 客户端库，提供与 GitCode 平台的完整集成。

## 安装

```bash
pnpm add @gitany/gitcode
```

## 快速开始

### 初始化客户端

```typescript
import { GitcodeClient } from '@gitany/gitcode';

const client = new GitcodeClient();
```

### 用户相关操作

```typescript
// 获取用户信息
const userProfile = await client.user.getProfile();
console.log(userProfile.name, userProfile.email);

// 获取用户命名空间
const namespace = await client.user.getNamespace();
console.log(namespace.path, namespace.type);
```

### 仓库相关操作

```typescript
// 获取仓库设置
const settings = await client.repo.getSettings('owner', 'repo');
console.log(settings.default_branch);

// 获取仓库分支
const branches = await client.repo.getBranches('owner', 'repo');
branches.forEach((branch) => {
  console.log(branch.name, branch.default);
});

// 获取提交历史
const commits = await client.repo.getCommits('owner', 'repo');
console.log(commits[0].sha, commits[0].commit.message);

// 获取贡献者
const contributors = await client.repo.getContributors('owner', 'repo');
contributors.forEach((contributor) => {
  console.log(contributor.name, contributor.contributions);
});

// 获取 Webhooks
const webhooks = await client.repo.getWebhooks('owner', 'repo');
console.log(webhooks.length);

// 获取文件内容
const fileBlob = await client.repo.getFileBlob('owner', 'repo', 'file-sha');
console.log(fileBlob.content, fileBlob.encoding);

// 比较代码差异
const comparison = await client.repo.compare('owner', 'repo', 'base', 'head');
console.log(comparison.files.length);
```

### Pull Request 操作

```typescript
// 获取 PR 列表
const pulls = await client.pr.list('https://gitcode.com/owner/repo', {
  state: 'open',
});

// 创建 PR
const newPR = await client.pr.create('https://gitcode.com/owner/repo', {
  title: '新功能',
  head: 'feature-branch',
  base: 'main',
  body: '这是一个新功能的 PR',
});

// 获取 PR 评论
const comments = await client.pr.comments('https://gitcode.com/owner/repo', 1);

// 获取 PR 设置
const prSettings = await client.pr.getSettings('owner', 'repo');
console.log(prSettings.allow_merge_commits);
```

### Issue 操作

```typescript
// 获取 Issue 列表
const issues = await client.issue.list('https://gitcode.com/owner/repo', {
  state: 'open',
});

// 获取 Issue 评论
const comments = await client.issue.comments('https://gitcode.com/owner/repo', 1);
```

### 认证

客户端支持多种认证方式：

```typescript
// 环境变量
process.env.GITANY_TOKEN = 'your-token';
// 或
process.env.GITCODE_TOKEN = 'your-token';

// 配置文件存储在 ~/.gitany/gitcode/config.json
```

## API 参考

### 用户 API

- `client.user.getProfile()` - 获取当前用户信息
- `client.user.getNamespace()` - 获取用户命名空间

### 仓库 API

- `client.repo.getSettings(owner, repo)` - 获取仓库设置
- `client.repo.getBranches(owner, repo)` - 获取仓库所有分支
- `client.repo.getBranch(owner, repo, branch)` - 获取特定分支信息
- `client.repo.getCommits(owner, repo)` - 获取仓库提交历史
- `client.repo.getContributors(owner, repo)` - 获取仓库贡献者
- `client.repo.getFileBlob(owner, repo, sha)` - 获取文件内容
- `client.repo.compare(owner, repo, base, head)` - 比较代码差异
- `client.repo.getWebhooks(owner, repo)` - 获取仓库 Webhooks
- `client.repo.getWebhook(owner, repo, id)` - 获取特定 Webhook

### Pull Request API

- `client.pr.list(url, options)` - 获取 PR 列表
- `client.pr.create(url, body)` - 创建新 PR
- `client.pr.comments(url, prNumber, options)` - 获取 PR 评论
- `client.pr.getSettings(owner, repo)` - 获取 PR 设置

### Issue API

- `client.issue.list(url, options)` - 获取 Issue 列表
- `client.issue.comments(url, issueNumber, options)` - 获取 Issue 评论

## 类型定义

所有 API 响应都有完整的 TypeScript 类型定义，包括：

- `UserProfile` - 用户信息
- `UserNamespace` - 用户命名空间
- `RepoSettings` - 仓库设置
- `Branch` - 分支信息
- `Commit` - 提交信息
- `Contributor` - 贡献者信息
- `FileBlob` - 文件内容
- `Compare` - 代码比较结果
- `Webhook` - Webhook 配置
- `PullRequestSettings` - PR 设置

## 错误处理

```typescript
try {
  const user = await client.user.getProfile();
} catch (error) {
  console.error('获取用户信息失败:', error);
}
```

## 许可证

MIT
