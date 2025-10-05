---
title: git-lib 工具库
---

# @gitany/git-lib（Git 命令封装库）

基于系统 `git` 命令的轻量封装，若运行环境缺少 `git`，所有函数将抛出 `GitNotFoundError`。

所有命令支持在 `cwd` 参数中使用 `~` 展开至用户主目录；若指定目录不存在，则返回包含错误信息的 `GitResult`（非 `null`）。

包路径：`packages/git-lib`

## 安装

```bash
pnpm add @gitany/git-lib
```

## API

### createGitClient(cwd?)

`createGitClient` 返回一个包含常用 Git 命令方法的轻量对象：

```ts
import { createGitClient } from '@gitany/git-lib';

const client = createGitClient('/path/to/repo');
const status = await client.status();
```

- `cwd`: 指定工作目录，默认使用当前工作目录。

返回对象包含以下方法：

- `run(args: string[])`
- `status()`
- `add(files?: string | string[], options?: { all?: boolean; update?: boolean })`
- `commit(message: string, options?: { addAll?: boolean })`
- `push(branch: string, options?: { remote?: string })`
- `fetch(branch?: string, options?: { remote?: string })`
- `branch(name: string, base?: string)`
- `checkout(name: string)`
- `clone(repo: string, directory?: string)`
- `showFile(ref: string, filePath: string)`
- `setRemote(remote: string, url: string)`
- `diffCommits(commit1: string, commit2: string, options?: DiffOptions)`

所有方法返回 `Promise<GitResult>`，具体使用示例：

```ts
const client = createGitClient();

await client.add(undefined, { all: true });
await client.commit('feat: 新功能');
await client.push('main');

const fileContent = await client.showFile('main', 'src/index.ts');
const diff = await client.diffCommits('HEAD', 'HEAD~1', { nameOnly: true });
```

## 函数式 API

也可以直接导入单个命令函数，并配合 `createGitRunner` 或 `createGitClient().run` 使用：

```ts
import { createGitRunner, gitAdd, gitCommit, gitPush } from '@gitany/git-lib';

const run = createGitRunner('/path/to/repo');

await gitAdd(run, 'file.txt');
await gitCommit(run, 'commit message');
await gitPush(run, 'main');
```

## 返回值

所有函数返回 `Promise<GitResult>`，`GitResult` 结构如下：

```ts
interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}
```

当 `git` 不存在或无法执行时会抛出 `GitNotFoundError`。

## 错误处理

```ts
import { createGitClient, GitNotFoundError } from '@gitany/git-lib';

try {
  const client = createGitClient();
  const result = await client.status();
  if (result.code !== 0) {
    console.log('命令执行失败:', result.stderr);
  } else {
    console.log('命令执行成功:', result.stdout);
  }
} catch (err) {
  if (err instanceof GitNotFoundError) {
    console.log('git 命令未找到');
  } else {
    console.log('未知错误:', (err as Error).message);
  }
}
```
