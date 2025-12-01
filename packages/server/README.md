# @xbghc/gitcode-actions-server

Express 后端服务，用于获取 GitCode 仓库的 PR 和 Issue 列表。

## 功能特性

- 获取仓库的 Pull Request 列表
- 获取仓库的 Issue 列表
- 支持多种过滤和排序选项
- RESTful API 接口
- 与 GitCode API 集成
- **交互式 API 文档**（Swagger UI）

## 安装

```bash
# 从 monorepo 根目录
pnpm install
```

## 配置

复制 `.env.example` 为 `.env` 并配置环境变量：

```bash
cp .env.example .env
```

环境变量说明：

```bash
# 环境设置
NODE_ENV=development  # development 或 production

# GitCode API Token
# 生产环境：用户必须在请求头中提供 TOKEN
# 开发环境：可以设置默认 TOKEN，用户请求未提供时使用
GITCODE_TOKEN=your_default_token_here

# 服务器端口（可选，默认 3000）
PORT=3000

# GitCode API Base URL（可选）
GITCODE_API_BASE=https://gitcode.com/api/v5

# Docker 节点配置（用于 Workflow 执行）
# 格式: name:host:port，多个节点用逗号分隔
# 例如: DOCKER_NODES=local:192.168.1.100:2375,remote:192.168.1.101:2375
DOCKER_NODES=local:192.168.1.100:2375
```

### Docker 节点配置

Server 通过远程 Docker API 执行 Workflow 任务。需要在目标机器上配置 Docker daemon 监听 TCP：

```bash
# 在 Docker 主机上编辑 /etc/docker/daemon.json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}

# 重启 Docker
sudo systemctl restart docker
```

然后在 Server 的环境变量中配置：

```bash
DOCKER_NODES=node1:192.168.1.100:2375
```

> **安全提示**：Docker Remote API 默认无认证。建议仅在可信内网使用，或配置防火墙限制访问来源。

## 开发

```bash
# 开发模式（自动重启）
pnpm dev:server

# 或者在 server 包目录下
cd packages/server
pnpm dev
```

## 构建

```bash
# 从 monorepo 根目录构建所有包
pnpm build

# 或者只构建 server 包
pnpm --filter @xbghc/gitcode-actions-server build
```

## 运行

```bash
# 生产模式
pnpm start
```

服务启动后：

- 访问 `http://localhost:3000/` - 自动跳转到 API 文档
- 访问 `http://localhost:3000/api-docs` - 查看 Swagger UI 交互式文档
- 访问 `http://localhost:3000/health` - 健康检查

## 认证说明

所有仓库相关的 API 都需要提供 GitCode Token 进行认证。

### 生产环境

**生产环境**下（`NODE_ENV=production`），必须在请求头中提供有效的 GitCode Token，否则将返回 401 错误。

### 开发环境

**开发环境**下（`NODE_ENV=development`），如果请求未提供 Token，将使用服务器配置的默认 Token（环境变量 `GITCODE_TOKEN`）。

### 如何提供 Token

支持以下三种方式之一：

1. **X-GitCode-Token** 请求头（推荐）

   ```
   X-GitCode-Token: your_token_here
   ```

2. **Authorization Bearer** 请求头

   ```
   Authorization: Bearer your_token_here
   ```

3. **X-Auth-Token** 请求头
   ```
   X-Auth-Token: your_token_here
   ```

### 获取 Token

使用 GitCode CLI 进行认证并获取 token：

```bash
# 安装 GitCode CLI
pnpm add -g @xbghc/gitcode-cli

# 登录并获取 token
gitcode auth login
```

## API 文档

本项目使用 **Swagger UI** 提供交互式 API 文档。启动服务器后，访问以下地址：

📖 **API 文档地址**: http://localhost:3000/api-docs

在文档页面，您可以：

- 查看所有 API 端点的详细信息
- 直接在浏览器中测试 API（支持设置认证 Token）
- 查看请求/响应的数据结构
- 下载 OpenAPI 规范文件

## API 端点

### 健康检查

```
GET /health
```

响应示例：

```json
{
  "status": "ok",
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

### 获取 PR 列表

```
POST /api/pulls
```

请求体：

```json
{
  "owner": "username",
  "repo": "repository-name",
  "state": "open", // 可选: open/closed/all
  "page": 1, // 可选: 页码
  "per_page": 20, // 可选: 每页数量
  "sort": "created", // 可选: 排序字段
  "direction": "desc", // 可选: asc/desc
  "head": "feature", // 可选: head 分支过滤
  "base": "main" // 可选: base 分支过滤
}
```

响应示例：

```json
{
  "owner": "username",
  "repo": "repository-name",
  "total": 15,
  "data": [
    {
      "id": 123456,
      "number": 42,
      "title": "Add new feature",
      "state": "open",
      "created_at": "2025-10-19T12:00:00Z",
      "updated_at": "2025-10-19T14:30:00Z"
    }
  ]
}
```

### 获取 Issue 列表

```
POST /api/issues
```

请求体：

```json
{
  "owner": "username",
  "repo": "repository-name",
  "state": "open", // 可选: open/closed/all
  "page": 1, // 可选: 页码
  "per_page": 20, // 可选: 每页数量
  "sort": "created", // 可选: created/updated/comments
  "labels": "bug,feature" // 可选: 标签过滤（逗号分隔）
}
```

响应示例：

```json
{
  "owner": "username",
  "repo": "repository-name",
  "total": 25,
  "data": [
    {
      "id": 789012,
      "number": "15",
      "title": "Bug: Login failed",
      "state": "open",
      "created_at": "2025-10-19T10:00:00Z",
      "updated_at": "2025-10-19T15:00:00Z"
    }
  ]
}
```

## 项目结构

```
packages/server/
├── src/
│   ├── index.ts                  # 服务器入口
│   ├── swagger.yaml              # OpenAPI 规范文档
│   ├── routes/
│   │   ├── repo.ts               # 仓库数据查询路由
│   │   ├── workflow.ts           # Workflow 执行路由
│   │   └── workflow-config.ts    # Workflow 配置路由
│   ├── services/
│   │   ├── docker-node-service.ts    # Docker 节点管理
│   │   ├── container-service.ts      # 容器操作封装
│   │   ├── job-executor-service.ts   # 任务执行引擎
│   │   ├── workflow-service.ts       # Workflow 服务
│   │   └── workflow-config-service.ts # Workflow 配置服务
│   ├── middleware/
│   │   ├── auth.ts               # 认证中间件
│   │   └── error-handler.ts      # 错误处理中间件
│   └── utils/
│       └── gitcode-client.ts     # GitCode 客户端工具
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 依赖关系

- `@xbghc/gitcode-api`: GitCode API 客户端
- `@xbghc/gitcode-actions`: 共享类型和工具
- `express`: Web 框架
- `cors`: CORS 中间件
- `dotenv`: 环境变量管理
- `dockerode`: Docker Remote API 客户端
- `swagger-ui-express`: Swagger UI 集成
- `yamljs`: YAML 解析器

## 使用示例

### 使用 curl

```bash
# 获取 PR 列表
curl -X POST http://localhost:3000/api/pulls \
  -H "Content-Type: application/json" \
  -H "X-GitCode-Token: your_token_here" \
  -d '{
    "owner": "username",
    "repo": "myrepo",
    "state": "open",
    "page": 1,
    "per_page": 10
  }'

# 获取 Issue 列表
curl -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -H "X-GitCode-Token: your_token_here" \
  -d '{
    "owner": "username",
    "repo": "myrepo",
    "state": "all",
    "labels": "bug,feature"
  }'

# 使用 Bearer Token 格式
curl -X POST http://localhost:3000/api/pulls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{
    "owner": "username",
    "repo": "myrepo"
  }'
```

### 使用 JavaScript/Fetch

```javascript
// 获取 PR 列表
const response = await fetch('http://localhost:3000/api/pulls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-GitCode-Token': 'your_token_here',
  },
  body: JSON.stringify({
    owner: 'username',
    repo: 'myrepo',
    state: 'open',
    page: 1,
    per_page: 20,
  }),
});

if (!response.ok) {
  if (response.status === 401) {
    console.error('未授权: 请提供有效的 GitCode Token');
  }
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
console.log(data);

// 使用 Authorization Bearer 格式
const response2 = await fetch('http://localhost:3000/api/issues', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your_token_here',
  },
  body: JSON.stringify({
    owner: 'username',
    repo: 'myrepo',
    state: 'all',
  }),
});
const issues = await response2.json();
```
