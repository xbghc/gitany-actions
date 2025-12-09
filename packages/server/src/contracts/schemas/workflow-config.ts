import { z } from 'zod';

// ========== Workflow 配置步骤 ==========
export const WorkflowConfigStepSchema = z.object({
  name: z.string().min(1, 'Step name is required').describe('步骤名称'),
  commands: z.array(z.string()).min(1, 'At least one command is required').describe('命令列表'),
});

// ========== Workflow 配置 ==========
export const WorkflowConfigSchema = z.object({
  id: z.string().describe('配置唯一 ID'),
  name: z.string().describe('配置名称'),
  steps: z.array(WorkflowConfigStepSchema).describe('执行步骤'),
  env: z.record(z.string()).optional().describe('环境变量'),
  timeout: z.number().optional().describe('超时时间（毫秒）'),
});

// ========== 请求 Body Schema ==========
export const CreateWorkflowConfigBodySchema = z.object({
  name: z.string().min(1, 'Config name is required').describe('配置名称'),
  steps: z
    .array(WorkflowConfigStepSchema)
    .min(1, 'At least one step is required')
    .describe('执行步骤'),
  env: z.record(z.string()).optional().describe('环境变量'),
  timeout: z.number().int().positive().optional().describe('超时时间（毫秒）'),
});

export const UpdateWorkflowConfigBodySchema = z.object({
  name: z.string().min(1).optional().describe('配置名称'),
  steps: z.array(WorkflowConfigStepSchema).min(1).optional().describe('执行步骤'),
  env: z.record(z.string()).optional().describe('环境变量'),
  timeout: z.number().int().positive().optional().describe('超时时间（毫秒）'),
});

// ========== 类型导出 ==========
export type WorkflowConfigStep = z.infer<typeof WorkflowConfigStepSchema>;
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;
export type CreateWorkflowConfigBody = z.infer<typeof CreateWorkflowConfigBodySchema>;
export type UpdateWorkflowConfigBody = z.infer<typeof UpdateWorkflowConfigBodySchema>;
