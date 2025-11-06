import { http } from './request';
import type {
  ApiResponse,
  WorkflowConfig,
  CreateWorkflowConfigRequest,
  UpdateWorkflowConfigRequest,
} from '@/types';

/**
 * 获取仓库的所有 Workflow 配置
 */
export const getWorkflowConfigs = (owner: string, repo: string) => {
  return http.get<ApiResponse<{ configs: WorkflowConfig[]; count: number }>>(
    `/api/workflow-configs/${owner}/${repo}`,
  );
};

/**
 * 获取单个 Workflow 配置
 */
export const getWorkflowConfig = (configId: string) => {
  return http.get<ApiResponse<WorkflowConfig>>(`/api/workflow-config/${configId}`);
};

/**
 * 创建新的 Workflow 配置
 */
export const createWorkflowConfig = (
  owner: string,
  repo: string,
  config: CreateWorkflowConfigRequest,
) => {
  return http.post<ApiResponse<WorkflowConfig>>(`/api/workflow-config/${owner}/${repo}`, config);
};

/**
 * 更新 Workflow 配置
 */
export const updateWorkflowConfig = (configId: string, config: UpdateWorkflowConfigRequest) => {
  return http.put<ApiResponse<WorkflowConfig>>(`/api/workflow-config/${configId}`, config);
};

/**
 * 删除 Workflow 配置
 */
export const deleteWorkflowConfig = (configId: string) => {
  return http.delete<ApiResponse<void>>(`/api/workflow-config/${configId}`);
};
