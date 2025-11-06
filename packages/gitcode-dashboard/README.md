# @xbghc/gitcode-dashboard

GitCode Dashboard 是一个基于 Vue 3 的前端应用，用于管理 GitCode 仓库的 Pull Request 和 Issue。

## 技术栈

- **框架**: Vue 3.5+ (Composition API + TypeScript)
- **构建工具**: Vite 6.x
- **UI 库**: Element Plus
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **HTTP 客户端**: Axios
- **Markdown 渲染**: marked

## 功能特性

### PR 管理

- ✅ PR 列表展示（支持状态筛选）
- ✅ PR 详情查看
- ✅ PR 评论管理
- ✅ 代码变更统计

### Issue 管理

- ✅ Issue 列表展示（支持状态筛选）
- ✅ Issue 详情查看
- ✅ 创建新 Issue
- ✅ 更新 Issue 状态
- ✅ Issue 评论管理

### 通用功能

- ✅ 仓库选择器
- ✅ 用户头像显示
- ✅ Markdown 内容渲染
- ✅ 状态标签
- ✅ 响应式布局

## 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
# 在项目根目录
pnpm dev:dashboard

# 或在 dashboard 目录
pnpm dev
```

开发服务器将在 http://localhost:5173 启动。

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

## 配置

### 环境变量

创建 `.env.local` 文件配置本地环境：

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 后端服务

Dashboard 需要 `@xbghc/gitcode-actions-server` 提供 API 服务。

1. 启动后端服务器:

```bash
pnpm dev:server
```

2. 确保设置了 `GITCODE_TOKEN` 环境变量:

```bash
export GITCODE_TOKEN=your_gitcode_token
```

3. 后端服务将在 http://localhost:3000 运行

## 项目结构

```
src/
├── api/              # API 客户端
│   ├── request.ts   # Axios 实例和拦截器
│   ├── pr.ts        # PR 相关 API
│   └── issue.ts     # Issue 相关 API
├── assets/           # 静态资源
├── components/       # 通用组件
│   ├── StatusTag.vue
│   ├── UserAvatar.vue
│   ├── MarkdownViewer.vue
│   ├── EmptyState.vue
│   └── CommentList.vue
├── views/            # 页面组件
│   ├── Dashboard.vue
│   ├── pr/
│   │   ├── PRList.vue
│   │   └── PRDetail.vue
│   └── issue/
│       ├── IssueList.vue
│       └── IssueDetail.vue
├── router/           # 路由配置
├── store/            # Pinia 状态管理
│   ├── repo.ts
│   ├── pr.ts
│   └── issue.ts
├── types/            # TypeScript 类型定义
├── App.vue           # 根组件
└── main.ts           # 应用入口
```

## API 路由

Dashboard 通过以下 RESTful API 与后端通信：

### Pull Request

- `GET /api/repo/:owner/:repo/pulls` - 获取 PR 列表
- `GET /api/repo/:owner/:repo/pulls/:number` - 获取 PR 详情
- `GET /api/repo/:owner/:repo/pulls/:number/comments` - 获取 PR 评论
- `POST /api/repo/:owner/:repo/pulls/:number/comments` - 添加 PR 评论
- `PATCH /api/repo/:owner/:repo/pulls/:number` - 更新 PR 状态
- `PUT /api/repo/:owner/:repo/pulls/:number/merge` - 合并 PR

### Issue

- `GET /api/repo/:owner/:repo/issues` - 获取 Issue 列表
- `GET /api/repo/:owner/:repo/issues/:number` - 获取 Issue 详情
- `POST /api/repo/:owner/:repo/issues` - 创建 Issue
- `PATCH /api/repo/:owner/:repo/issues/:number` - 更新 Issue
- `GET /api/repo/:owner/:repo/issues/:number/comments` - 获取 Issue 评论
- `POST /api/repo/:owner/:repo/issues/:number/comments` - 添加 Issue 评论

## 使用指南

### 1. 设置仓库

首次使用时，在仪表盘页面输入：

- **所有者**: GitCode 仓库的所有者用户名
- **仓库**: 仓库名称

例如: `owner/repo`

设置后，仓库信息将保存在 localStorage 中。

### 2. 管理 Pull Request

- 点击左侧菜单的 "Pull Request" 进入 PR 列表
- 可以按状态筛选 PR（全部/开放/已关闭/已合并）
- 点击 PR 条目查看详情
- 在详情页可以查看代码变更和添加评论

### 3. 管理 Issue

- 点击左侧菜单的 "Issue" 进入 Issue 列表
- 可以按状态筛选 Issue（全部/开放/已关闭）
- 点击"创建 Issue"按钮创建新 Issue
- 点击 Issue 条目查看详情
- 在详情页可以更新状态和添加评论

## 注意事项

1. **认证**: Dashboard 通过后端服务进行认证，确保后端配置了正确的 `GITCODE_TOKEN`
2. **CORS**: 开发环境使用 Vite 代理，生产环境需要配置后端 CORS
3. **路由模式**: 使用 HTML5 History 模式，部署时需要配置服务器重定向

## License

MIT
