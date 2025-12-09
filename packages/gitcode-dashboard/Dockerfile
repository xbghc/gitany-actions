# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

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
