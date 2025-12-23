import { useI18n } from 'vue-i18n';
import type { WorkflowStatus } from '@/store/workflow';

type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary';

/**
 * 获取 Workflow 状态的标签类型（用于 el-tag）
 */
export const getStatusTagType = (status: WorkflowStatus): TagType => {
  const typeMap: Record<WorkflowStatus, TagType> = {
    success: 'success',
    failed: 'danger',
    running: 'warning',
    pending: 'info',
  };
  return typeMap[status] || 'info';
};

/**
 * 组合式函数：获取状态文本
 * 使用方式：const { getStatusText } = useStatusText()
 */
export const useStatusText = () => {
  const { t } = useI18n();

  const getStatusText = (status: WorkflowStatus): string => {
    return t(`status.${status}`);
  };

  return { getStatusText };
};
