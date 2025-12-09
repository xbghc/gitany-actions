# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Use China npm mirror
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

# Enable pnpm via corepack (built into Node.js)
RUN corepack enable

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy dashboard package
COPY packages/gitcode-dashboard ./packages/gitcode-dashboard

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build dashboard
RUN pnpm --filter @xbghc/gitcode-dashboard build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/packages/gitcode-dashboard/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/gitcode-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
