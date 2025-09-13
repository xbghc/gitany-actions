---
title: Issues API
---

# Issues

提供与 Issue 相关的类型与路径构建工具，并通过 `GitcodeClient` 暴露便捷方法。

适用接口：

- 列表：GET `/api/v5/repos/{owner}/{repo}/issues`

## 类型与导出

- `ListIssuesQuery`：Issue 列表查询参数（`state`、`labels`、`page`、`per_page`）。
- `ListIssuesParams`：包含 `owner`、`repo` 与可选 `query`。
- `Issue`：Issue 的最小字段表示（`id`、`html_url`、`number`、`state`、`title`、`body`、`user`）。
- `ListIssuesResponse`：`Issue[]`。
- `listIssuesUrl(owner, repo)`：构建列表接口绝对 URL。

以上均从包入口 `@gitany/gitcode` 导出。

## 使用示例

```ts
import { GitcodeClient, listIssuesUrl } from '@gitany/gitcode';

const client = new GitcodeClient({ token: process.env.GITCODE_TOKEN ?? null });

// 1) 列表 Issues（通过 options.query 传参）
const listUrl = listIssuesUrl('owner', 'repo');
const issues = await client.request(listUrl, 'GET', {
  query: { state: 'open', page: 1, per_page: 20, labels: 'bug' },
});

// 也可通过模块方式调用：
const issues2 = await client.issue.list('https://gitcode.com/owner/repo.git', {
  state: 'open',
});
```

## 说明

- 网络请求层统一由内部的 `utils/http.ts` 中的 `httpRequest` 处理，对外行为不变。
- 字段与返回值与 GitCode 文档保持一致的最小子集，返回结果会通过 Zod 进行结构校验。
