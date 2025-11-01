import { http } from './request';
import type { ApiResponse, WorkflowConfig, WorkflowResult, RegistryMirrorTestResult } from '@/types';

/**
 * 触发 PR 的 build 和 lint 测试
 */
export const triggerPRWorkflow = (prNumber: number, config: WorkflowConfig) => {
  return http.post<ApiResponse<{ workflowId: string; status: string }>>(
    `/api/workflow/pr/${prNumber}`,
    config
  );
};

/**
 * 获取 workflow 状态
 */
export const getWorkflowStatus = (workflowId: string) => {
  return http.get<ApiResponse<WorkflowResult>>(`/api/workflow/${workflowId}`);
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
  return http.post<ApiResponse<RegistryMirrorTestResult>>(
    '/api/workflow/test-registry-mirror',
    { mirror, mirrorName, testImage }
  );
};

/**
 * 测试所有预定义的 Docker 镜像源
 */
export const testAllRegistryMirrors = (testImage?: string) => {
  return http.get<ApiResponse<RegistryMirrorTestResult[]>>(
    '/api/workflow/test-all-registry-mirrors',
    { params: { testImage } }
  );
};
