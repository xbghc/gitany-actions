# GitCode Actions 部署指南

使用 Docker Compose 一键部署 GitCode Actions Server 和 Dashboard。

## 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

## 快速开始

```bash
# 1. 进入 deploy 目录
cd deploy

# 2. 复制并编辑环境变量
cp .env.example .env
# 编辑 .env 文件配置必要的环境变量

# 3. 构建并启动服务
docker compose up -d --build

# 4. 查看服务状态
docker compose ps

# 5. 查看日志
docker compose logs -f
```

启动后访问：

- **Dashboard**: http://localhost:8080
- **Server API**: http://localhost:3000
- **API 文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health

## 环境变量配置

| 变量           | 默认值       | 说明            |
| -------------- | ------------ | --------------- |
| `NODE_ENV`     | `production` | 运行环境        |
| `PORT`         | `3000`       | Server 端口     |
| `DOCKER_NODES` | `local`      | Docker 节点配置 |
| `LOG_LEVEL`    | `info`       | 日志级别        |

## Docker 节点配置

Server 需要访问 Docker 来执行 workflow。配置方式：

### 本机 Docker（默认）

```bash
DOCKER_NODES=local
```

容器通过挂载 `/var/run/docker.sock` 访问宿主机 Docker。

### 远程 Docker 节点

```bash
# 单个远程节点
DOCKER_NODES=remote1:192.168.1.100:2375

# 多个节点（负载均衡）
DOCKER_NODES=local,remote1:192.168.1.100:2375,remote2:192.168.1.101:2375
```

远程 Docker 主机需要开启 TCP 端口：

```json
// /etc/docker/daemon.json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```

> **安全提示**: Docker Remote API 默认无认证，请在内网使用或配置防火墙。

## 生产部署建议

### HTTPS 配置

建议在 Dashboard 前面添加反向代理（如 Nginx、Caddy）处理 HTTPS：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 日志管理

已默认配置日志轮转（单文件最大 10MB，保留 3 个文件）。

查看日志：

```bash
docker compose logs -f server
docker compose logs -f dashboard
```

### 数据持久化

如需持久化 watcher 状态：

```yaml
services:
  server:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data/watchers:/root/.gitcode/watchers
```

## 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重新构建
docker compose up -d --build

# 项目更新
git pull && docker compose up -d --build

# 查看日志
docker compose logs -f server
docker compose logs -f dashboard

# 进入容器调试
docker compose exec server sh
docker compose exec dashboard sh

# 清理所有数据
docker compose down -v --rmi all
```
