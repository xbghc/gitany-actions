import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { RepoParamsSchema, SuccessResponseSchema, ErrorResponseSchema } from './schemas/common.js';
import {
  WorkflowResultSchema,
  WorkflowLogMetaSchema,
  TriggerWorkflowBodySchema,
  CleanupWorkflowQuerySchema,
} from './schemas/workflow.js';

const c = initContract();

export const workflowContract = c.router(
  {
    // POST /api/workflow/pr/:number
    triggerPRWorkflow: {
      method: 'POST',
      path: '/workflow/pr/:number',
      pathParams: z.object({
        number: z.coerce.number().int().positive().describe('PR 编号'),
      }),
      body: TriggerWorkflowBodySchema,
      responses: {
        200: SuccessResponseSchema(
          z.object({
            workflowId: z.string(),
            status: z.string(),
          }),
        ),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '触发 PR 的 workflow',
      description: '为指定的 Pull Request 触发 workflow 执行',
    },

    // GET /api/workflow/:workflowId
    getWorkflowStatus: {
      method: 'GET',
      path: '/workflow/:workflowId',
      pathParams: z.object({
        workflowId: z.string().describe('Workflow ID'),
      }),
      responses: {
        200: SuccessResponseSchema(WorkflowResultSchema),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '查询 workflow 状态',
      description: '获取指定 workflow 的执行状态和详细信息',
    },

    // DELETE /api/workflow/cleanup
    cleanupWorkflows: {
      method: 'DELETE',
      path: '/workflow/cleanup',
      query: CleanupWorkflowQuerySchema,
      body: z.undefined(),
      responses: {
        200: SuccessResponseSchema(
          z.object({
            deletedCount: z.number(),
            message: z.string(),
          }),
        ),
        500: ErrorResponseSchema,
      },
      summary: '清理过期的 workflow 记录',
      description: '删除旧的 workflow 执行记录',
    },

    // GET /api/workflows/:owner/:repo
    listWorkflows: {
      method: 'GET',
      path: '/workflows/:owner/:repo',
      pathParams: RepoParamsSchema,
      responses: {
        200: SuccessResponseSchema(
          z.object({
            workflows: z.array(WorkflowResultSchema),
            count: z.number(),
          }),
        ),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '列出仓库的所有 workflow',
      description: '获取指定仓库的所有 workflow 执行记录',
    },

    // GET /api/repos/:owner/:repo/workflows/logs
    listWorkflowLogs: {
      method: 'GET',
      path: '/repos/:owner/:repo/workflows/logs',
      pathParams: RepoParamsSchema,
      responses: {
        200: SuccessResponseSchema(
          z.object({
            logs: z.array(WorkflowLogMetaSchema),
            count: z.number(),
          }),
        ),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 workflow 历史日志列表',
      description: '获取指定仓库的所有 workflow 执行日志的元数据列表',
    },

    // GET /api/repos/:owner/:repo/workflows/logs/:id
    getWorkflowLog: {
      method: 'GET',
      path: '/repos/:owner/:repo/workflows/logs/:id',
      pathParams: RepoParamsSchema.extend({
        id: z.string().describe('Workflow ID'),
      }),
      responses: {
        200: SuccessResponseSchema(WorkflowResultSchema),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取 workflow 完整数据',
      description: '获取指定 workflow 的完整 WorkflowResult 对象',
    },

    // DELETE /api/repos/:owner/:repo/workflows/logs/:id
    deleteWorkflowLog: {
      method: 'DELETE',
      path: '/repos/:owner/:repo/workflows/logs/:id',
      pathParams: RepoParamsSchema.extend({
        id: z.string().describe('Workflow ID'),
      }),
      body: z.undefined(),
      responses: {
        200: SuccessResponseSchema(z.object({ message: z.string() })),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '删除 workflow 日志',
      description: '删除指定的 workflow 日志文件',
    },

    // POST /api/workflow/test-registry-mirror (501)
    testRegistryMirror: {
      method: 'POST',
      path: '/workflow/test-registry-mirror',
      body: z.object({}).optional(),
      responses: {
        501: ErrorResponseSchema,
      },
      summary: '测试单个 Docker 镜像源',
      description: '测试指定 Docker 镜像源的可用性（未实现）',
    },

    // GET /api/workflow/test-all-registry-mirrors (501)
    testAllRegistryMirrors: {
      method: 'GET',
      path: '/workflow/test-all-registry-mirrors',
      responses: {
        501: ErrorResponseSchema,
      },
      summary: '测试所有 Docker 镜像源',
      description: '测试所有预定义的 Docker 镜像源（未实现）',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type WorkflowContract = typeof workflowContract;
