import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Issue, IssueFilterParams, IssueCount } from '@/types';
import { getIssueList, getIssueCount } from '@/api';
import { useRepoStore } from './repo';
import { generateCacheKey, getCache, setCache } from '@/utils/swrCache';

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

  // 获取 Issue 列表（使用 SWR 策略）
  const fetchIssueList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      issueList.value = [];
      return;
    }

    // 1. 生成缓存键
    const cacheKey = generateCacheKey({
      type: 'issue',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
      page: filters.value.page || 1,
      per_page: filters.value.per_page || 20,
      state: filters.value.state || 'all',
    });

    // 2. 尝试从缓存读取并立即显示（Stale）
    const cached = await getCache<Issue[]>(cacheKey);
    if (cached) {
      issueList.value = cached;
    }

    // 3. 发起网络请求获取最新数据（Revalidate）
    // 只有在没有缓存时才显示 loading，有缓存则静默更新
    loading.value = !cached;
    try {
      const response = await getIssueList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        filters.value
      );
      if (response.data) {
        issueList.value = response.data;
        // 更新缓存（不等待完成）
        setCache(cacheKey, response.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Issue 列表失败:', error);
      }
      // 如果没有缓存，则清空列表
      if (!cached) {
        issueList.value = [];
      }
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
      if (import.meta.env.DEV) {
        console.error('获取 Issue 数量失败:', error);
      }
      issueCount.value = null;
    } finally {
      countLoading.value = false;
    }
  };

  /**
   * 预取指定页面的数据
   * @param page 要预取的页码
   */
  const prefetchPage = async (page: number) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return;
    }

    const perPage = filters.value.per_page || 20;
    const cacheKey = generateCacheKey({
      type: 'issue',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
      page,
      per_page: perPage,
      state: filters.value.state || 'all',
    });

    // 如果已经有缓存，不重复请求
    const cached = await getCache<Issue[]>(cacheKey);
    if (cached) {
      return;
    }

    // 静默请求指定页数据
    try {
      const response = await getIssueList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        {
          ...filters.value,
          page,
        }
      );
      if (response.data) {
        setCache(cacheKey, response.data);
      }
    } catch (error) {
      // 预取失败不影响用户体验，静默处理
      if (import.meta.env.DEV) {
        console.debug(`预取第 ${page} 页失败:`, error);
      }
    }
  };

  /**
   * 预取下一页数据
   */
  const prefetchNextPage = async () => {
    if (!issueCount.value) {
      return;
    }

    const currentPage = filters.value.page || 1;
    const perPage = filters.value.per_page || 20;

    // 根据当前筛选状态获取总数
    let total = 0;
    switch (filters.value.state) {
      case 'open':
        total = issueCount.value.opened || 0;
        break;
      case 'closed':
        total = issueCount.value.closed || 0;
        break;
      case 'all':
      default:
        total = issueCount.value.all || 0;
    }

    // 计算总页数
    const totalPages = Math.ceil(total / perPage);

    // 如果没有下一页，不预取
    if (currentPage >= totalPages) {
      return;
    }

    await prefetchPage(currentPage + 1);
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
    prefetchNextPage,
    prefetchPage,
  };
});
