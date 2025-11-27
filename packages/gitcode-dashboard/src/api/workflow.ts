import { http } from './request';
import type {
  ApiResponse,
  TriggerPRWorkflowRequest,
  WorkflowResult,
  WorkflowLogMeta,
  RegistryMirrorTestResult,
} from '@/types';

/**
 * 触发 PR 的 build 和 lint 测试
 */
export const triggerPRWorkflow = (prNumber: number, config: TriggerPRWorkflowRequest) => {
  return http.post<ApiResponse<{ workflowId: string; status: string }>>(
    `/api/workflow/pr/${prNumber}`,
    config,
  );
};

/**
 * 获取仓库的 Workflow 执行历史列表
 */
export const getWorkflowList = (owner: string, repo: string) => {
  return http.get<ApiResponse<{ workflows: WorkflowResult[]; count: number }>>(
    `/api/workflows/${owner}/${repo}`,
  );
};

/**
 * 获取 workflow 状态
 */
export const getWorkflowStatus = (workflowId: string) => {
  return http.get<ApiResponse<WorkflowResult>>(`/api/workflow/${workflowId}`);
};

/**
 * 清理过期的 Workflow 记录
 * @param maxAge 最大保留时间（毫秒），不传则使用服务端默认值
 */
export const cleanupOldWorkflows = (maxAge?: number) => {
  return http.delete<ApiResponse<{ deletedCount: number; message: string }>>(
    '/api/workflow/cleanup',
    {
      params: maxAge ? { maxAge } : undefined,
    },
  );
};

/**
 * 创建 SSE 连接接收实时输出
 * @param workflowId workflow ID
 * @param baseURL API基础URL
 * @returns EventSource 实例
 */
export const createWorkflowStream = (workflowId: string, baseURL?: string) => {
  const apiBase = baseURL || import.meta.env.VITE_API_BASE_URL || '';
  const url = `${apiBase}/api/workflow/${workflowId}/stream`;
  return new EventSource(url);
};

/**
 * 测试单个 Docker 镜像源
 */
export const testRegistryMirror = (mirror?: string, mirrorName?: string, testImage?: string) => {
  return http.post<ApiResponse<RegistryMirrorTestResult>>('/api/workflow/test-registry-mirror', {
    mirror,
    mirrorName,
    testImage,
  });
};

/**
 * 测试所有预定义的 Docker 镜像源
 */
export const testAllRegistryMirrors = (testImage?: string) => {
  return http.get<ApiResponse<RegistryMirrorTestResult[]>>(
    '/api/workflow/test-all-registry-mirrors',
    { params: { testImage } },
  );
};

/**
 * 获取 workflow 历史日志列表（元数据）
 */
export const getWorkflowLogs = (owner: string, repo: string) => {
  return http.get<ApiResponse<{ logs: WorkflowLogMeta[]; count: number }>>(
    `/api/repos/${owner}/${repo}/workflows/logs`,
  );
};

/**
 * 获取单个 workflow 完整日志
 */
export const getWorkflowLogDetail = (owner: string, repo: string, id: string) => {
  return http.get<ApiResponse<WorkflowResult>>(`/api/repos/${owner}/${repo}/workflows/logs/${id}`);
};

/**
 * 删除 workflow 日志
 */
export const deleteWorkflowLog = (owner: string, repo: string, id: string) => {
  return http.delete<ApiResponse<{ message: string }>>(
    `/api/repos/${owner}/${repo}/workflows/logs/${id}`,
  );
};
