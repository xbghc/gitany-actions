import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import type { Issue, IssueFilterParams, IssueCount } from '@/types';
import { getIssueList, getIssueCount, getIssueDetail } from '@/api';
import { useRepoStore } from './repo';

export const useIssueStore = defineStore('issue', () => {
  const repoStore = useRepoStore();

  // Data cache: Map<issueNumber, Issue>
  const issueCache = ref(new Map<number, Issue>());

  // State for issue list view
  const issueListIds = ref<number[]>([]);
  const loadingList = ref(false);

  // State for issue detail view
  const currentIssueNumber = ref<number | null>(null);
  const loadingDetail = ref(false);

  // Issue 数量统计
  const issueCount = ref<IssueCount | null>(null);
  const countLoading = ref(false);

  // 筛选参数
  const filters = ref<IssueFilterParams>({
    state: 'all',
    page: 1,
    per_page: 20,
  });

  // Computed property for the list of issues from cache
  const issueList = computed(() => {
    return issueListIds.value.map(id => issueCache.value.get(id)).filter(Boolean) as Issue[];
  });

  // Computed property for the currently viewed issue detail from cache
  const issueDetail = computed(() => {
    return currentIssueNumber.value ? issueCache.value.get(currentIssueNumber.value) : null;
  });

  // Unified loading state
  const loading = computed(() => loadingList.value || loadingDetail.value);

  // Helper to update cache
  const updateCache = (issues: Issue[]) => {
    issues.forEach(issue => {
      issueCache.value.set(issue.number, issue);
    });
  };

  // 获取 Issue 列表
  const fetchIssueList = async (fetchFilters = filters.value) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loadingList.value = false;
      issueListIds.value = [];
      return;
    }

    loadingList.value = true;
    try {
      const response = await getIssueList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        fetchFilters
      );
      if (response.data) {
        updateCache(response.data);
        // Only update the main list if the filters match the current ones
        if (fetchFilters === filters.value) {
          issueListIds.value = response.data.map(issue => issue.number);
        }
      }
    } catch (error) {
      console.error('获取 Issue 列表失败:', error);
      issueListIds.value = [];
    } finally {
      loadingList.value = false;
    }
  };

  // 获取 Issue 详情
  const fetchIssueDetail = async (issueNumber: number) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return;

    currentIssueNumber.value = issueNumber;
    loadingDetail.value = true;
    try {
      const response = await getIssueDetail(
        repoStore.currentOwner,
        repoStore.currentRepo,
        issueNumber
      );
      if (response.data) {
        updateCache([response.data]);
      }
    } catch (error) {
      console.error(`获取 Issue #${issueNumber} 详情失败:`, error);
    } finally {
      loadingDetail.value = false;
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
        // 清空缓存和状态
        issueCache.value.clear();
        issueListIds.value = [];
        currentIssueNumber.value = null;
        // 重置筛选条件
        resetFilters();
        // 重新加载列表和数量
        fetchIssueList();
        fetchIssueCount();
      } else {
        // 清空所有内容
        issueCache.value.clear();
        issueListIds.value = [];
        currentIssueNumber.value = null;
        issueCount.value = null;
        loadingList.value = false;
        loadingDetail.value = false;
      }
    },
    { immediate: true }
  );

  return {
    // State & Computed
    issueList,
    issueDetail,
    loading,
    filters,
    issueCount,
    countLoading,
    // Actions
    fetchIssueList,
    fetchIssueDetail,
    fetchIssueCount,
    updateFilters,
    resetFilters,
  };
});
