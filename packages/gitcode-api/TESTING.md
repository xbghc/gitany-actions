# GitCode API 测试系统

本包采用**最小化测试策略**，避免无意义的 Mock 测试，聚焦真正有价值的测试。

## 测试结构

```
src/
├── utils/
│   ├── index.ts
│   └── index.test.ts        # 单元测试（总是运行）
└── __tests__/
    └── e2e/
        ├── pr.e2e.ts        # PR 模块 E2E
        ├── issue.e2e.ts     # Issue 模块 E2E
        ├── repo.e2e.ts      # Repo 模块 E2E
        └── user.e2e.ts      # User 模块 E2E
```

## 测试分层

### 1️⃣ 单元测试（Unit Tests）

**测试内容**: 纯函数，不依赖外部 API

- `parseGitUrl()` - URL 解析
- `toGitUrl()` - URL 格式化
- `toQuery()` - 查询参数构建

**运行时机**: 每次 CI、本地开发（快速、稳定）

```bash
# 运行单元测试
pnpm test

# 监听模式（开发时使用）
pnpm test:watch
```

### 2️⃣ E2E 测试（End-to-End Tests）

**测试内容**: 真实 GitCode API 调用

- 验证 API 契约
- 发现 API 变化
- 确保 Zod schema 能解析真实响应

**运行时机**:

- ❌ **不在 PR 检查中运行**（避免依赖 token、rate limit）
- ✅ **定时任务**: 每天凌晨 2 点（UTC）
- ✅ **手动触发**: 本地开发或 CI workflow_dispatch

```bash
# 运行 E2E 测试（需要 GITCODE_TOKEN）
GITCODE_TOKEN=your_token pnpm test:e2e

# 运行所有测试
GITCODE_TOKEN=your_token pnpm test:all
```

## 可用脚本

| 命令                 | 说明                        |
| -------------------- | --------------------------- |
| `pnpm test`          | 运行单元测试（仅工具函数）  |
| `pnpm test:unit`     | 同上                        |
| `pnpm test:e2e`      | 运行 E2E 测试（需要 token） |
| `pnpm test:all`      | 运行所有测试                |
| `pnpm test:watch`    | 监听模式运行单元测试        |
| `pnpm test:coverage` | 生成覆盖率报告              |
| `pnpm test:ui`       | 打开 Vitest UI 界面         |

## CI 集成

### PR 检查（`.github/workflows/pr-checks.yml`）

```yaml
- Build
- Test (仅单元测试) # 新增
- Type Check
- Lint
```

**特点**:

- ✅ 快速反馈（<5 秒）
- ✅ 不需要 secrets
- ✅ 稳定可靠

### 夜间 E2E 测试（`.github/workflows/nightly-e2e.yml`）

```yaml
on:
  schedule:
    - cron: '0 2 * * *' # 每天凌晨 2 点
  workflow_dispatch: # 支持手动触发
```

**特点**:

- 🔍 监控 API 变化
- 📧 失败时自动创建 Issue
- 🚫 不阻塞 PR 合并

## E2E 测试配置

### 环境变量

E2E 测试需要真实的 GitCode token：

```bash
# 方式 1: 命令行传递
GITCODE_TOKEN=xxx pnpm test:e2e

# 方式 2: .env 文件（不要提交到仓库！）
echo "GITCODE_TOKEN=xxx" > .env
pnpm test:e2e
```

### 测试仓库

E2E 测试使用真实仓库 `https://gitcode.com/xbghc/gitcode-actions`。

如需修改，编辑测试文件中的 `TEST_REPO_URL` 常量。

## 测试覆盖率目标

| 模块     | 目标覆盖率 | 说明                  |
| -------- | ---------- | --------------------- |
| `utils/` | 100%       | 纯函数，必须全覆盖    |
| 其他模块 | N/A        | 通过 E2E 验证真实功能 |

## 为什么不使用 Mock 测试？

Mock 测试的问题：

1. **无法验证真实 API 契约** - Mock 数据可能与实际不符
2. **只测试了自己的假设** - "我认为 API 会返回 X"
3. **维护成本高** - API 变化时需要同步更新 mock 数据
4. **假象的安全感** - 即使测试通过，真实调用也可能失败

## 最佳实践

### 本地开发

1. **编写代码时**: 运行 `pnpm test:watch` 监听单元测试
2. **功能完成后**: 使用真实 token 运行 E2E 测试验证
3. **提交前**: 确保 `pnpm test` 通过

### CI 策略

1. **PR 检查**: 仅运行快速的单元测试（秒级反馈）
2. **定时监控**: 每天自动运行 E2E 测试（发现 API 变化）
3. **失败处理**: E2E 失败时自动创建 Issue，但不阻止开发

## 常见问题

### Q: E2E 测试失败怎么办？

A: 检查以下几点：

1. `GITCODE_TOKEN` 是否有效
2. 测试仓库是否可访问
3. GitCode API 是否有变化（查看 Issue 中的详细日志）

### Q: 如何添加新的测试？

**单元测试**: 在 `src/utils/index.test.ts` 中添加新的 `it()` 块

**E2E 测试**: 在 `src/__tests__/e2e/` 相应模块文件中添加测试用例

### Q: 本地如何运行完整测试？

```bash
# 确保设置了 token
export GITCODE_TOKEN=your_token

# 运行所有测试
pnpm test:all
```

## 测试统计

- **单元测试**: 22 个用例（100% 覆盖 utils 模块）
- **E2E 测试**: 4 个文件，覆盖 PR/Issue/Repo/User 所有模块
- **总运行时间**:
  - 单元测试: ~200ms
  - E2E 测试: ~5-10s（取决于网络）

## 相关链接

- [Vitest 官方文档](https://vitest.dev/)
- [GitCode API 文档](https://gitcode.com/help/api/v5)
