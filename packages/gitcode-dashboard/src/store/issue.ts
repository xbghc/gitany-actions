import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Issue, IssueFilterParams, IssueCount } from '@/types';
import { getIssueList, getIssueCount } from '@/api';
import { useRepoStore } from './repo';

export const useIssueStore = defineStore('issue', () => {
  const repoStore = useRepoStore();

  // Issue 列表
  const issueList = ref<Issue[]>([]);
  const loading = ref(false);

  // Issue 数量统计
  const issueCount = ref<IssueCount | null>(null);
  const countLoading = ref(false);

  // 筛选参数
  const filters = ref<IssueFilterParams>({
    state: 'all',
    page: 1,
    per_page: 20,
  });

  // 获取 Issue 列表
  const fetchIssueList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      issueList.value = [];
      return;
    }

    loading.value = true;
    try {
      const response = await getIssueList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        filters.value
      );
      if (response.data) {
        issueList.value = response.data;
      }
    } catch (error) {
      console.error('获取 Issue 列表失败:', error);
      issueList.value = [];
    } finally {
      loading.value = false;
    }
  };

  // 获取 Issue 数量统计
  const fetchIssueCount = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      issueCount.value = null;
      return;
    }

    countLoading.value = true;
    try {
      const response = await getIssueCount(
        repoStore.currentOwner,
        repoStore.currentRepo
      );
      if (response.data) {
        issueCount.value = response.data;
      }
    } catch (error) {
      console.error('获取 Issue 数量失败:', error);
      issueCount.value = null;
    } finally {
      countLoading.value = false;
    }
  };

  // 更新筛选条件
  const updateFilters = (newFilters: Partial<IssueFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    fetchIssueList();
  };

  // 重置筛选条件
  const resetFilters = () => {
    filters.value = {
      state: 'all',
      page: 1,
      per_page: 20,
    };
  };

  // 监听仓库切换，自动重新加载数据
  watch(
    () => repoStore.selectedRepoId,
    (newRepoId) => {
      if (newRepoId) {
        // 重置筛选条件
        resetFilters();
        // 重新加载列表和数量
        fetchIssueList();
        fetchIssueCount();
      } else {
        // 清空列表并重置 loading 状态
        issueList.value = [];
        issueCount.value = null;
        loading.value = false;
      }
    },
    { immediate: true }
  );

  return {
    issueList,
    loading,
    filters,
    issueCount,
    countLoading,
    fetchIssueList,
    fetchIssueCount,
    updateFilters,
    resetFilters,
  };
});
