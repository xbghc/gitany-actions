# GitCode Actions

GitCode 平台的开发者工具集 — API 客户端、命令行工具、自动化工作流

## 快速体验

```bash
# 安装 CLI
npm i -g @xbghc/gitcode-cli

# 设置认证
gitcode auth set-token YOUR_TOKEN

# 在任意 GitCode 仓库目录下
gitcode pr checkout 42                        # 一键切到 PR 分支
gitcode issue create -t "Bug: 登录失败"       # 快速创建 Issue
gitcode pr list                               # 自动识别当前仓库
```

## 核心包

| 包                                                     | 用途                               |
| ------------------------------------------------------ | ---------------------------------- |
| [`@xbghc/gitcode-api`](./packages/gitcode-api)         | 强类型 REST 客户端，支持缓存与重试 |
| [`@xbghc/gitcode-cli`](./packages/gitcode-cli)         | 命令行工具，类似 `gh` 的体验       |
| [`@xbghc/gitcode-actions`](./packages/gitcode-actions) | 事件监听、容器编排、AI 助手        |

## API 客户端

```ts
import { GitCodeClient } from '@xbghc/gitcode-api';

const client = new GitCodeClient(process.env.GITCODE_TOKEN);

// 模块化 API
const issues = await client.issue.list(repoUrl, { state: 'open' });
const pr = await client.pr.create(repoUrl, { title: '新功能', head: 'feature' });
await client.repo.getNotifications('owner', 'repo');
```

## 自动化工作流

```ts
import { watchPullRequest } from '@xbghc/gitcode-actions';

// 监听 PR 事件
watchPullRequest(client, repoUrl, {
  onOpen: (pr) => console.log(`PR #${pr.number} opened`),
  onComment: (pr, comment) => handleComment(comment),
  container: { image: 'node:22' }, // 可选：容器化执行
}).start();
```

## 开发

```bash
# 环境要求：Node.js 22+, pnpm 10+

pnpm install    # 安装依赖
pnpm build      # 构建所有包
pnpm test       # 运行测试
pnpm docs:dev   # 启动文档站点
```

## 认证配置

```bash
# 方式一：CLI 保存（推荐）
gitcode auth set-token <token>

# 方式二：环境变量
export GITCODE_TOKEN=your-token
```

Token 获取：[GitCode 个人设置 → 访问令牌](https://gitcode.com/profile/personal_access_tokens)

## 链接

- [CLI 完整文档](./docs/gitcode-cli/index.md)
- [API 参考](./docs/gitcode-api/index.md)
- [贡献指南](./docs/contributing.md)

## License

MIT
