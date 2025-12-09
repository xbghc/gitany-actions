# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Clear proxy and use China npm mirror
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV http_proxy=
ENV https_proxy=
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

# Enable pnpm via corepack (built into Node.js)
RUN corepack enable

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy dependent packages
COPY packages/gitcode-api ./packages/gitcode-api
COPY packages/gitcode-actions ./packages/gitcode-actions
COPY packages/server ./packages/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages in order
RUN pnpm --filter @xbghc/gitcode-api build
RUN pnpm --filter @xbghc/gitcode-actions build
RUN pnpm --filter @xbghc/gitcode-actions-server build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Clear proxy and use China npm mirror
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV http_proxy=
ENV https_proxy=
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

# Enable pnpm via corepack
RUN corepack enable

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built packages
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/actions/dist ./packages/actions/dist
COPY --from=builder /app/packages/actions/package.json ./packages/actions/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

WORKDIR /app/packages/server

EXPOSE 3000

CMD ["node", "dist/index.js"]
