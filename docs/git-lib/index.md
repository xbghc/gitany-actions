---
title: git-lib 工具库
---

# @gitany/git-lib（Git 命令封装库）

基于系统 `git` 命令的轻量封装，若运行环境缺少 `git`，所有函数返回 `null`。

所有命令支持在 `cwd` 参数中使用 `~` 展开至用户主目录；若指定目录不存在，则返回包含错误信息的 `GitResult`（非 `null`）。

包路径：`packages/git-lib`

## API

```ts
import { setRemote, commit, push, fetch, newBranch } from '@gitany/git-lib';
```

### setRemote(remote, url, options?)
设置或新增远程仓库地址。

### commit(message, options?)
提交当前修改，默认先执行 `git add -A`。

### push(branch, options?)
推送当前分支到远程同名分支，默认远程为 `origin`。

### fetch(branch?, options?)
拉取远程更新，默认远程为 `origin`。

### newBranch(name, options?)
创建并切换到新分支（可通过 `checkout: false` 仅创建）。

## 返回值

所有函数返回 `Promise<GitResult | null>`，`GitResult` 结构如下：

```ts
interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}
```

当 `git` 不存在或无法执行时返回 `null`。

