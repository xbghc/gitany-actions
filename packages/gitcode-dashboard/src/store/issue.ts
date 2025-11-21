import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Issue, IssueFilterParams, IssueCount } from '@/types';
import { getIssueList, getIssueCount } from '@/api';
import { useRepoStore } from './repo';

export const useIssueStore = defineStore('issue', () => {
  const repoStore = useRepoStore();

  // Issue 列表（当前显示）
  const issueList = ref<Issue[]>([]);
  const loading = ref(false);

  // Issue 数量统计
  const issueCount = ref<IssueCount | null>(null);
  const countLoading = ref(false);

  // 筛选参数（默认 open 状态，降序）
  const filters = ref<IssueFilterParams>({
    state: 'open',
    page: 1,
    per_page: 10,
    sort: 'updated',
    direction: 'desc',
  });

  /**
   * 获取 Issue 列表（直接从 API 获取）
   */
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
        filters.value,
      );

      if (response.data) {
        issueList.value = response.data;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Issue 列表失败:', error);
      }
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
      const response = await getIssueCount(repoStore.currentOwner, repoStore.currentRepo);
      if (response.data) {
        issueCount.value = response.data;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Issue 数量失败:', error);
      }
      issueCount.value = null;
    } finally {
      countLoading.value = false;
    }
  };

  // 更新筛选条件并重新获取数据
  const updateFilters = (newFilters: Partial<IssueFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    fetchIssueList();
  };

  // 监听 filters 变化，自动重新获取
  watch(
    () => [filters.value.state, filters.value.page, filters.value.per_page],
    () => {
      fetchIssueList();
    },
  );

  // 重置筛选条件
  const resetFilters = () => {
    filters.value = {
      state: 'open',
      page: 1,
      per_page: 20,
      sort: 'updated',
      direction: 'desc',
    };
  };

  // 监听仓库切换，自动重新加载数据
  watch(
    () => repoStore.selectedRepoId,
    async (newRepoId) => {
      if (newRepoId) {
        // 1. 立即清空旧数据
        issueList.value = [];
        issueCount.value = null;

        // 2. 重置筛选条件为 open
        resetFilters();

        // 3. 设置加载状态
        loading.value = true;

        // 4. 获取数量统计和数据
        await fetchIssueCount();
        await fetchIssueList();
      } else {
        issueList.value = [];
        issueCount.value = null;
        loading.value = false;
      }
    },
    { immediate: true },
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
