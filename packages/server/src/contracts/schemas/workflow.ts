import { z } from 'zod';

// ========== Workflow 状态 ==========
export const WorkflowStatusSchema = z.enum(['pending', 'running', 'success', 'failed']);

// ========== Workflow 步骤 ==========
export const WorkflowStepSchema = z.object({
  name: z.string().describe('步骤名称'),
  status: WorkflowStatusSchema.describe('步骤状态'),
  output: z.string().optional().describe('步骤输出（日志）'),
  startTime: z.string().optional().describe('开始时间'),
  endTime: z.string().optional().describe('结束时间'),
});

// ========== Workflow 结果 ==========
export const WorkflowResultSchema = z.object({
  workflowId: z.string().describe('Workflow 唯一标识'),
  owner: z.string().describe('仓库所有者'),
  repo: z.string().describe('仓库名称'),
  repoUrl: z.string().describe('仓库 URL'),
  prNumber: z.number().describe('PR 编号'),
  configId: z.string().optional().describe('配置 ID'),
  configName: z.string().optional().describe('配置名称'),
  status: WorkflowStatusSchema.describe('整体状态'),
  steps: z.array(WorkflowStepSchema).describe('执行步骤列表'),
  createdAt: z.string().describe('创建时间'),
  completedAt: z.string().optional().describe('完成时间'),
  error: z.string().optional().describe('错误信息'),
});

// ========== Workflow 日志元数据 ==========
export const WorkflowLogMetaSchema = z.object({
  workflowId: z.string().describe('Workflow 唯一标识'),
  owner: z.string().describe('仓库所有者'),
  repo: z.string().describe('仓库名称'),
  prNumber: z.number().describe('PR 编号'),
  configId: z.string().optional().describe('配置 ID'),
  configName: z.string().optional().describe('配置名称'),
  status: WorkflowStatusSchema.describe('执行状态'),
  createdAt: z.string().describe('创建时间'),
  completedAt: z.string().optional().describe('完成时间'),
  duration: z.number().optional().describe('执行耗时（毫秒）'),
});

// ========== 请求 Body Schema ==========
export const TriggerWorkflowBodySchema = z.object({
  owner: z.string().min(1, 'owner is required').describe('仓库所有者'),
  repo: z.string().min(1, 'repo is required').describe('仓库名称'),
  configId: z.string().min(1, 'configId is required').describe('配置 ID'),
});

// ========== 查询参数 ==========
export const CleanupWorkflowQuerySchema = z.object({
  maxAge: z.coerce.number().optional().describe('最大保留时间（毫秒）'),
});

// ========== 类型导出 ==========
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
export type WorkflowLogMeta = z.infer<typeof WorkflowLogMetaSchema>;
export type TriggerWorkflowBody = z.infer<typeof TriggerWorkflowBodySchema>;
