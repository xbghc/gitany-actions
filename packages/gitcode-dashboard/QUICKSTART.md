# GitCode Dashboard 快速启动指南

## 前置条件

1. 确保已安装 Node.js 18+ 和 pnpm 10+
2. 获取 GitCode API Token

## 启动步骤

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 启动后端服务

```bash
# 配置环境变量
export GITCODE_TOKEN=your_gitcode_token_here

# 启动服务器（端口 3000）
pnpm dev:server
```

### 3. 启动前端 Dashboard

在新的终端窗口中：

```bash
# 启动 Dashboard（端口 5173）
pnpm dev:dashboard
```

### 4. 访问应用

打开浏览器访问: http://localhost:5173

## 首次使用

1. 在仪表盘页面设置仓库信息：
   - **所有者**: 例如 `xbghc`
   - **仓库**: 例如 `gitcode-actions`

2. 点击"设置仓库"保存

3. 导航到 PR 或 Issue 页面开始管理

## 常见问题

### Q: 页面显示"请先在仪表盘设置仓库"

A: 需要先在首页设置要管理的仓库信息。

### Q: API 请求失败

A: 检查：

- 后端服务是否正常运行（http://localhost:3000/health）
- GITCODE_TOKEN 环境变量是否正确设置
- 网络连接是否正常

### Q: 页面空白或报错

A: 打开浏览器控制台查看错误信息，可能是：

- 后端服务未启动
- API 代理配置问题
- 依赖未正确安装

## 开发提示

- 前端修改会自动热重载
- API 请求会通过 Vite 代理到 `http://localhost:3000`
- 仓库信息保存在浏览器 localStorage 中
- Element Plus 组件会自动导入
