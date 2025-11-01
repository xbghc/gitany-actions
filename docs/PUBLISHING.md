# 发布指南

本文档说明如何发布 GitCode Actions monorepo 中的 npm 包。

## 发布的包

以下包会发布到 npm：

- `@xbghc/gitcode-api` - GitCode API 客户端库
- `@xbghc/git-lib` - Git 命令包装器
- `@xbghc/gitcode-cli` - GitCode 命令行工具

## 发布前准备

### 1. 环境要求

- Node.js 22+
- pnpm 10+
- npm 账号并已登录

### 2. 登录 npm

```bash
npm login
```

确认登录状态：
```bash
npm whoami
```

### 3. 更新版本号

手动编辑每个要发布包的 `package.json`，更新 `version` 字段。

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：
- **Patch** (0.1.0 → 0.1.1): 向下兼容的 bug 修复
- **Minor** (0.1.0 → 0.2.0): 向下兼容的新功能
- **Major** (0.1.0 → 1.0.0): 不兼容的 API 变更

### 4. 更新 CHANGELOG

编辑每个包的 `CHANGELOG.md`，记录本次发布的变更：

```markdown
## [0.2.0] - 2024-01-20

### Added
- 新功能描述

### Changed
- 变更描述

### Fixed
- Bug 修复描述
```

### 5. 提交变更

```bash
git add .
git commit -m "chore: release v0.2.0"
```

## 发布流程

### 方式一：使用交互式脚本（推荐）

#### 1. 预演发布

首先运行 dry-run 模式，检查所有条件：

```bash
pnpm run publish:dry-run
```

脚本会检查：
- ✓ Git 工作区状态
- ✓ npm 登录状态
- ✓ 版本号有效性（自动与 npm 对比）
- ✓ 构建和类型检查

**版本检查逻辑**：
- 如果本地版本号已存在于 npm → 提示更新版本号
- 如果本地版本号小于等于 npm 最新版本 → 提示更新版本号
- 如果本地版本号大于 npm 最新版本 → 通过检查
- 如果包未发布过 → 通过检查（首次发布）

#### 2. 正式发布

确认一切正常后，执行发布：

```bash
pnpm run publish:packages
```

脚本会：
1. 执行所有检查
2. 询问确认
3. 按依赖顺序发布包：
   - @xbghc/gitcode-api（无依赖）
   - @xbghc/git-lib（无依赖）
   - @xbghc/gitcode-cli（依赖前两者）
4. 询问是否创建 git tags
5. 询问是否推送 tags

### 方式二：手动发布

如果需要手动发布单个包：

```bash
# 发布 API 包
pnpm --filter @xbghc/gitcode-api publish --access public

# 发布 Git 库
pnpm --filter @xbghc/git-lib publish --access public

# 发布 CLI（必须在前两者发布后）
pnpm --filter @xbghc/gitcode-cli publish --access public
```

**注意**：pnpm 会自动将 `workspace:*` 依赖转换为实际版本号。

## 发布后

### 1. 创建 Git Tags

```bash
git tag @xbghc/gitcode-api@0.2.0
git tag @xbghc/git-lib@0.2.0
git tag @xbghc/gitcode-cli@0.2.0
```

### 2. 推送到远程

```bash
git push origin dev
git push --tags
```

### 3. 验证发布

访问 npm 查看发布的包：
- https://www.npmjs.com/package/@xbghc/gitcode-api
- https://www.npmjs.com/package/@xbghc/git-lib
- https://www.npmjs.com/package/@xbghc/gitcode-cli

## 版本管理规范

### 版本号格式

使用语义化版本 `MAJOR.MINOR.PATCH`：

- `0.x.y` - 初始开发阶段，API 可能不稳定
- `1.0.0` - 第一个稳定版本
- `1.x.y` - 稳定版本，向下兼容

### CHANGELOG 格式

遵循 [Keep a Changelog](https://keepachangelog.com/) 规范：

- `Added` - 新功能
- `Changed` - 现有功能的变更
- `Deprecated` - 即将废弃的功能
- `Removed` - 已删除的功能
- `Fixed` - Bug 修复
- `Security` - 安全修复

### 包版本同步

通常情况下，建议所有包使用相同的版本号，即使某个包没有变更。这样：
- ✓ 简化版本管理
- ✓ 用户容易理解依赖关系
- ✓ 避免版本冲突

特殊情况下可以单独发布某个包，但需要注意依赖关系。

## 常见问题

### Q: 发布失败：版本已存在

**原因**：npm 不允许覆盖已发布的版本。

**解决**：更新 `package.json` 中的版本号，确保版本号大于 npm 上的最新版本。

### Q: 发布失败：403 权限错误

**原因**：
1. 未登录 npm
2. 没有包的发布权限

**解决**：
```bash
# 重新登录
npm logout
npm login

# 检查登录状态
npm whoami
```

### Q: workspace 依赖没有转换

**原因**：pnpm 会自动转换 `workspace:*` 为实际版本号，但需要确保：
1. 被依赖的包已经发布
2. 版本号在 package.json 中正确

**解决**：按依赖顺序发布，先发布基础库，再发布依赖它们的包。

### Q: 如何撤回已发布的版本

**npm unpublish 限制**：
- 发布后 72 小时内可以撤回
- 只能撤回没有被其他包依赖的版本

```bash
# 撤回指定版本
npm unpublish @xbghc/gitcode-cli@0.2.0

# 撤回整个包（慎用）
npm unpublish @xbghc/gitcode-cli --force
```

**更好的方式**：发布修复版本而不是撤回。

### Q: 如何发布 beta 版本

```bash
# 更新版本号为 beta
# package.json: "version": "0.2.0-beta.1"

# 发布到 beta tag
pnpm --filter @xbghc/gitcode-cli publish --tag beta --access public

# 用户安装
npm install @xbghc/gitcode-cli@beta
```

## 自动化发布（未来）

考虑使用 GitHub Actions 自动化发布流程：

1. PR 合并到 main 分支
2. 自动检查版本号
3. 运行测试和构建
4. 自动发布到 npm
5. 自动创建 GitHub Release

参考 `.github/workflows/publish.yml`（待实现）。

## 参考资料

- [npm 发布文档](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [pnpm 工作区](https://pnpm.io/workspaces)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Keep a Changelog](https://keepachangelog.com/)
