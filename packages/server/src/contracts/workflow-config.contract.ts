import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  RepoParamsSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
} from './schemas/common.js';
import {
  WorkflowConfigSchema,
  CreateWorkflowConfigBodySchema,
  UpdateWorkflowConfigBodySchema,
} from './schemas/workflow-config.js';

const c = initContract();

export const workflowConfigContract = c.router(
  {
    // GET /api/repos/:owner/:repo/workflows
    listWorkflowConfigs: {
      method: 'GET',
      path: '/repos/:owner/:repo/workflows',
      pathParams: RepoParamsSchema,
      responses: {
        200: SuccessResponseSchema(
          z.object({
            configs: z.array(WorkflowConfigSchema),
            count: z.number(),
          }),
        ),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '列出仓库的所有 Workflow 配置',
      description: '获取指定仓库的所有 Workflow 配置列表',
    },

    // POST /api/repos/:owner/:repo/workflows
    createWorkflowConfig: {
      method: 'POST',
      path: '/repos/:owner/:repo/workflows',
      pathParams: RepoParamsSchema,
      body: CreateWorkflowConfigBodySchema,
      responses: {
        200: SuccessResponseSchema(
          z.object({
            config: WorkflowConfigSchema,
          }),
        ),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '创建 Workflow 配置',
      description: '为指定仓库创建新的 Workflow 配置',
    },

    // PUT /api/repos/:owner/:repo/workflows/:id
    updateWorkflowConfig: {
      method: 'PUT',
      path: '/repos/:owner/:repo/workflows/:id',
      pathParams: RepoParamsSchema.extend({
        id: z.string().describe('配置 ID'),
      }),
      body: UpdateWorkflowConfigBodySchema,
      responses: {
        200: SuccessResponseSchema(
          z.object({
            config: WorkflowConfigSchema,
          }),
        ),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '更新 Workflow 配置',
      description: '更新指定的 Workflow 配置',
    },

    // DELETE /api/repos/:owner/:repo/workflows/:id
    deleteWorkflowConfig: {
      method: 'DELETE',
      path: '/repos/:owner/:repo/workflows/:id',
      pathParams: RepoParamsSchema.extend({
        id: z.string().describe('配置 ID'),
      }),
      body: z.undefined(),
      responses: {
        200: MessageResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '删除 Workflow 配置',
      description: '删除指定的 Workflow 配置',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type WorkflowConfigContract = typeof workflowConfigContract;
