import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createRequire } from 'module';
import { createExpressEndpoints } from '@ts-rest/express';

// 契约和 handlers
import {
  prContract,
  issueContract,
  workflowContract,
  workflowConfigContract,
  userContract,
  eventsContract,
  oauthContract,
} from './contracts/index.js';
import {
  prHandler,
  issueHandler,
  workflowHandler,
  workflowConfigHandler,
  userHandler,
  eventsHandler,
  oauthHandler,
} from './handlers/index.js';

// OpenAPI 生成
import { generateOpenAPISpec } from './openapi/generator.js';

// 特殊路由（SSE、二进制响应等）
import { sseRouter } from './routes/sse.js';

// 中间件
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { avatarTransformerMiddleware } from './middleware/avatar-transformer.js';
import { requestLogger } from './middleware/request-logger.js';

// 服务
import { logger } from './utils/logger.js';
import { dockerNodeService } from './services/docker-node-service.js';

dotenv.config();

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { name: string; version: string };

const app = express();
const PORT = process.env.PORT || 3000;

// 生成 OpenAPI 文档
const swaggerDocument = generateOpenAPISpec();

// 基础中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use(requestLogger);

// Avatar URL 转换器
app.use(avatarTransformerMiddleware);

// 根路径重定向到 API 文档
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GitCode Actions Server API',
  }),
);

// 健康检查
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: pkg.name,
    version: pkg.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 特殊路由（SSE、avatar-proxy）- 必须在 ts-rest 路由之前
app.use('/api', sseRouter);

// 注册 ts-rest 路由
// @ts-expect-error - ts-rest handler types are complex
createExpressEndpoints(prContract, prHandler, app);
// @ts-expect-error - ts-rest handler types are complex
createExpressEndpoints(issueContract, issueHandler, app);
// @ts-expect-error - ts-rest handler types are complex
createExpressEndpoints(workflowContract, workflowHandler, app);
createExpressEndpoints(workflowConfigContract, workflowConfigHandler, app);
createExpressEndpoints(userContract, userHandler, app);
// @ts-expect-error - ts-rest Express req.query type conflict with ParsedQs
createExpressEndpoints(eventsContract, eventsHandler, app);
createExpressEndpoints(oauthContract, oauthHandler, app);

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
async function start() {
  // 初始化 Docker 节点
  await dockerNodeService.initialize();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, `Server started on http://localhost:${PORT}`);
    logger.info({ docs: `http://localhost:${PORT}/api-docs` }, 'API Documentation available');
  });
}

start().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
