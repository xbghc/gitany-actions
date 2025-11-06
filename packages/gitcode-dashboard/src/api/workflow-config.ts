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
    `/api/repos/${owner}/${repo}/workflows`,
  );
};

/**
 * 创建新的 Workflow 配置
 */
export const createWorkflowConfig = (
  owner: string,
  repo: string,
  config: CreateWorkflowConfigRequest,
) => {
  return http.post<ApiResponse<WorkflowConfig>>(`/api/repos/${owner}/${repo}/workflows`, config);
};

/**
 * 更新 Workflow 配置
 */
export const updateWorkflowConfig = (
  owner: string,
  repo: string,
  id: string,
  config: UpdateWorkflowConfigRequest,
) => {
  return http.put<ApiResponse<WorkflowConfig>>(
    `/api/repos/${owner}/${repo}/workflows/${id}`,
    config,
  );
};

/**
 * 删除 Workflow 配置
 */
export const deleteWorkflowConfig = (owner: string, repo: string, id: string) => {
  return http.delete<ApiResponse<void>>(`/api/repos/${owner}/${repo}/workflows/${id}`);
};
