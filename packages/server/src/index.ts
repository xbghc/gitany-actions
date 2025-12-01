import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { repoRouter } from './routes/repo.js';
import { prRouter } from './routes/pr.js';
import { issueRouter } from './routes/issue.js';
import { eventsRouter } from './routes/events.js';
import { workflowRouter } from './routes/workflow.js';
import { workflowConfigRouter } from './routes/workflow-config.js';
import dockerNodeRouter from './routes/docker-node.js';
import { userRouter } from './routes/user.js';
import { oauthRouter } from './routes/oauth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { avatarTransformerMiddleware } from './middleware/avatar-transformer.js';
import { requestLogger } from './middleware/request-logger.js';
import { logger } from './utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { name: string; version: string };

const app = express();
const PORT = process.env.PORT || 3000;

// Load Swagger document
const swaggerDocument = YAML.load(join(__dirname, 'swagger.yaml'));

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use(requestLogger);

// Avatar URL transformer - must be before routes to intercept res.json()
app.use(avatarTransformerMiddleware);

// Root path - redirect to API docs
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GitCode Actions Server API',
  }),
);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: pkg.name,
    version: pkg.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api', oauthRouter);
app.use('/api', userRouter);
app.use('/api', repoRouter);
app.use('/api', prRouter);
app.use('/api', issueRouter);
app.use('/api', eventsRouter);
app.use('/api', workflowRouter);
app.use('/api', workflowConfigRouter);
app.use('/api/docker-nodes', dockerNodeRouter);

// 404 handler
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, `Server started on http://localhost:${PORT}`);
  logger.info({ docs: `http://localhost:${PORT}/api-docs` }, 'API Documentation available');
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
