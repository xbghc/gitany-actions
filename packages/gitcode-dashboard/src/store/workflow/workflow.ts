import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { getWorkflowList } from '@/api';
import { useRepoStore } from '../repo';
import type { WorkflowResult, WorkflowStatus } from './types';

export const useWorkflowStore = defineStore('workflow', () => {
  const repoStore = useRepoStore();

  // Workflow 列表
  const workflowList = ref<WorkflowResult[]>([]);
  const loading = ref(false);
  const totalCount = ref(0);

  // 状态筛选
  const statusFilter = ref<WorkflowStatus | 'all'>('all');

  // 分页
  const currentPage = ref(1);
  const pageSize = ref(20);

  /**
   * 筛选后的 Workflow 列表
   */
  const filteredWorkflowList = computed(() => {
    if (statusFilter.value === 'all') {
      return workflowList.value;
    }
    return workflowList.value.filter((workflow) => workflow.status === statusFilter.value);
  });

  /**
   * 分页后的 Workflow 列表
   */
  const pagedWorkflowList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredWorkflowList.value.slice(start, end);
  });

  /**
   * 筛选后的总数
   */
  const filteredCount = computed(() => filteredWorkflowList.value.length);

  /**
   * 获取 Workflow 列表
   */
  const fetchWorkflowList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      workflowList.value = [];
      totalCount.value = 0;
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const response = await getWorkflowList(repoStore.currentOwner, repoStore.currentRepo);

      if (response.data) {
        workflowList.value = response.data.workflows || [];
        totalCount.value = response.data.count || 0;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Workflow 列表失败:', error);
      }
      workflowList.value = [];
      totalCount.value = 0;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 刷新 Workflow 列表
   */
  const refreshWorkflowList = () => {
    currentPage.value = 1;
    return fetchWorkflowList();
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
    workflowList.value = [];
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
        await fetchWorkflowList();
      } else {
        resetState();
      }
    },
    { immediate: true },
  );

  return {
    workflowList,
    loading,
    totalCount,
    statusFilter,
    currentPage,
    pageSize,
    filteredWorkflowList,
    pagedWorkflowList,
    filteredCount,
    fetchWorkflowList,
    refreshWorkflowList,
    updateStatusFilter,
    updatePage,
    resetState,
  };
});
