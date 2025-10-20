import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PullRequest, PRFilterParams } from '@/types';
import { getPRList } from '@/api';
import { useRepoStore } from './repo';

export const usePRStore = defineStore('pr', () => {
  const repoStore = useRepoStore();

  // PR 列表
  const prList = ref<PullRequest[]>([]);
  const loading = ref(false);

  // 筛选参数
  const filters = ref<PRFilterParams>({
    state: 'all',
    page: 1,
    per_page: 20,
  });

  // 获取 PR 列表
  const fetchPRList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      prList.value = [];
      return;
    }

    loading.value = true;
    try {
      const response = await getPRList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        filters.value
      );
      if (response.data) {
        prList.value = response.data;
      }
    } catch (error) {
      console.error('获取 PR 列表失败:', error);
      prList.value = [];
    } finally {
      loading.value = false;
    }
  };

  // 更新筛选条件
  const updateFilters = (newFilters: Partial<PRFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    fetchPRList();
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
        // 重新加载列表
        fetchPRList();
      } else {
        // 清空列表并重置 loading 状态
        prList.value = [];
        loading.value = false;
      }
    },
    { immediate: true }
  );

  return {
    prList,
    loading,
    filters,
    fetchPRList,
    updateFilters,
    resetFilters,
  };
});
