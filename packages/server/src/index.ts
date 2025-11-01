import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { repoRouter } from './routes/repo.js';
import { prRouter } from './routes/pr.js';
import { issueRouter } from './routes/issue.js';
import { workflowRouter } from './routes/workflow.js';
import { errorHandler } from './middleware/error-handler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Load Swagger document
const swaggerDocument = YAML.load(join(__dirname, 'swagger.yaml'));

// Middleware
app.use(cors());
app.use(express.json());

// Root path - redirect to API docs
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'GitCode Actions Server API',
}));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', repoRouter);
app.use('/api', prRouter);
app.use('/api', issueRouter);
app.use('/api', workflowRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
