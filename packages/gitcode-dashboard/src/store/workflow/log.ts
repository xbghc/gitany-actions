import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { getWorkflowLogs, deleteWorkflowLog } from '@/api';
import { useRepoStore } from '../repo';
import { ElMessage } from 'element-plus';
import type { WorkflowLogMeta, WorkflowStatus } from './types';

export const useWorkflowLogStore = defineStore('workflowLog', () => {
  const repoStore = useRepoStore();

  // Workflow 日志列表
  const logList = ref<WorkflowLogMeta[]>([]);
  const loading = ref(false);
  const totalCount = ref(0);

  // 状态筛选
  const statusFilter = ref<WorkflowStatus | 'all'>('all');

  // 分页
  const currentPage = ref(1);
  const pageSize = ref(20);

  /**
   * 筛选后的日志列表
   */
  const filteredLogList = computed(() => {
    if (statusFilter.value === 'all') {
      return logList.value;
    }
    return logList.value.filter((log) => log.status === statusFilter.value);
  });

  /**
   * 分页后的日志列表
   */
  const pagedLogList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredLogList.value.slice(start, end);
  });

  /**
   * 筛选后的总数
   */
  const filteredCount = computed(() => filteredLogList.value.length);

  /**
   * 获取 Workflow 日志列表
   */
  const fetchLogList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      logList.value = [];
      totalCount.value = 0;
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const response = await getWorkflowLogs(repoStore.currentOwner, repoStore.currentRepo);

      if (response.data) {
        logList.value = response.data.logs || [];
        totalCount.value = response.data.count || 0;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Workflow 日志列表失败:', error);
      }
      logList.value = [];
      totalCount.value = 0;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 刷新日志列表
   */
  const refreshLogList = () => {
    currentPage.value = 1;
    return fetchLogList();
  };

  /**
   * 删除 Workflow 日志
   */
  const deleteLog = async (id: string) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      ElMessage.error('请先选择仓库');
      return false;
    }

    try {
      await deleteWorkflowLog(repoStore.currentOwner, repoStore.currentRepo, id);
      ElMessage.success('日志已删除');

      // 刷新列表
      await fetchLogList();
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('删除日志失败:', error);
      }
      ElMessage.error('删除日志失败');
      return false;
    }
  };

  /**
   * 更新状态筛选
   */
  const updateStatusFilter = (status: WorkflowStatus | 'all') => {
    statusFilter.value = status;
    currentPage.value = 1; // 切换筛选时重置页码
  };

  /**
   * 更新分页
   */
  const updatePage = (page: number) => {
    currentPage.value = page;
  };

  /**
   * 重置所有状态
   */
  const resetState = () => {
    logList.value = [];
    totalCount.value = 0;
    statusFilter.value = 'all';
    currentPage.value = 1;
    loading.value = false;
  };

  // 监听仓库切换，自动重新加载数据
  watch(
    () => repoStore.selectedRepoId,
    async (newRepoId) => {
      if (newRepoId) {
        resetState();
        await fetchLogList();
      } else {
        resetState();
      }
    },
    { immediate: true },
  );

  return {
    logList,
    loading,
    totalCount,
    statusFilter,
    currentPage,
    pageSize,
    filteredLogList,
    pagedLogList,
    filteredCount,
    fetchLogList,
    refreshLogList,
    deleteLog,
    updateStatusFilter,
    updatePage,
    resetState,
  };
});
