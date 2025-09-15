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

### GitClient 类

推荐使用 `GitClient` 类进行面向对象的 Git 操作：

```ts
import { GitClient } from '@gitany/git-lib';

const client = new GitClient('/path/to/repo');
```

#### 构造函数

```ts
constructor(cwd?: string)
```

- `cwd`: 工作目录，默认为当前工作目录

#### GitClient 方法

##### status()

查看仓库状态。

```ts
const result = await client.status();
```

##### add(files?, options?)

添加文件到暂存区。

```ts
// 添加所有文件
await client.add(undefined, { all: true });

// 添加当前目录
await client.add();

// 添加单个文件
await client.add('file.txt');

// 添加多个文件
await client.add(['file1.txt', 'file2.txt']);

// 仅更新已跟踪的文件
await client.add(undefined, { update: true });
```

**参数:**

- `files`: 文件路径或文件路径数组
- `options.all`: 是否添加所有文件（`git add -A`）
- `options.update`: 是否仅更新已跟踪的文件（`git add -u`）

##### commit(message, options?)

提交修改。

```ts
await client.commit('fix: 修复bug');
await client.commit('feat: 新功能', { addAll: false });
```

**参数:**

- `message`: 提交信息
- `options.addAll`: 是否在提交前执行 `git add -A`，默认为 `true`

##### push(branch, options?)

推送分支到远程。

```ts
await client.push('main');
await client.push('feature-branch', { remote: 'upstream' });
```

**参数:**

- `branch`: 分支名称
- `options.remote`: 远程仓库名称，默认为 `origin`

##### fetch(branch?, options?)

拉取远程更新。

```ts
await client.fetch();
await client.fetch('main');
await client.fetch('feature-branch', { remote: 'upstream' });
```

**参数:**

- `branch`: 分支名称，可选
- `options.remote`: 远程仓库名称，默认为 `origin`

##### branch(name, base?)

创建新分支。

```ts
await client.branch('feature-branch');
await client.branch('feature-branch', 'main');
```

**参数:**

- `name`: 新分支名称
- `base`: 基础分支，可选

##### checkout(name)

切换分支。

```ts
await client.checkout('main');
await client.checkout('feature-branch');
```

**参数:**

- `name`: 目标分支名称

##### clone(repo, directory?)

克隆仓库。

```ts
await client.clone('https://github.com/user/repo.git');
await client.clone('https://github.com/user/repo.git', '~/projects/repo');
```

**参数:**

- `repo`: 仓库URL
- `directory`: 目标目录，可选

##### showFile(ref, filePath)

显示指定分支的文件内容。

```ts
const result = await client.showFile('main', 'src/index.ts');
console.log(result.stdout);
```

**参数:**

- `ref`: 分支名或提交哈希
- `filePath`: 文件路径

##### setRemote(remote, url)

设置远程仓库。

```ts
await client.setRemote('origin', 'https://github.com/user/repo.git');
await client.setRemote('upstream', 'https://github.com/original/repo.git');
```

**参数:**

- `remote`: 远程仓库名称
- `url`: 远程仓库URL

##### diffCommits(commit1, commit2, options?)

比较两个提交的差异。

```ts
await client.diffCommits('HEAD', 'HEAD~1');
await client.diffCommits('main', 'feature-branch', { nameOnly: true });
```

**参数:**

- `commit1`: 第一个提交
- `commit2`: 第二个提交
- `options.nameOnly`: 是否只显示文件名，默认为 `false`

##### run(args)

执行任意 git 命令。

```ts
await client.run(['log', '--oneline', '-5']);
await client.run(['status', '-s']);
```

**参数:**

- `args`: git 命令参数数组

## 函数式 API

也可以直接导入单个函数使用：

```ts
import { gitAdd, gitCommit, gitPush } from '@gitany/git-lib';

// 使用函数式 API
await gitAdd(client, 'file.txt');
await gitCommit(client, 'commit message');
await gitPush(client, 'main');
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
import { GitNotFoundError } from '@gitany/git-lib';

try {
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
