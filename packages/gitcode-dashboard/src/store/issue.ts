import { getIssueCount, getIssueList } from '@/api';
import type { Issue, IssueCount, IssueFilterParams } from '@/types';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRepoStore } from './repo';

interface CacheEntry {
  data: Issue[];
  timestamp: number;
}

const TTL = 3 * 60 * 1000; // 3 minutes

export const useIssueStore = defineStore('issue', () => {
  const repoStore = useRepoStore();

  // Issue 列表（当前显示）
  const issueList = ref<Issue[]>([]);
  const loading = ref(false);

  // 缓存
  const cache = new Map<string, CacheEntry>();

  // Issue 数量统计缓存（按仓库缓存）
  const issueCountCache = ref(new Map<string, IssueCount>());
  const issueCount = computed(() => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return null;
    const key = `${repoStore.currentOwner}/${repoStore.currentRepo}`;
    return issueCountCache.value.get(key) ?? null;
  });
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
   * 生成缓存 Key
   */
  const getCacheKey = (owner: string, repo: string, params: IssueFilterParams) => {
    // 确保参数顺序一致以保证缓存命中
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (obj, key) => {
          const value = params[key as keyof IssueFilterParams];
          if (value !== undefined && value !== null) {
            obj[key] = String(value);
          }
          return obj;
        },
        {} as Record<string, string>,
      );
    const queryString = new URLSearchParams(sortedParams).toString();
    return `/api/repo/${owner}/${repo}/issues?${queryString}`;
  };

  /**
   * 查询 Issue 列表（带缓存）
   * @param page 可选页码，如果不传则使用当前 filters 中的 page
   */
  const queryIssueList = async (page?: number) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return [];
    }

    const currentParams: IssueFilterParams = { ...filters.value };
    if (page) {
      currentParams.page = page;
    }

    const key = getCacheKey(repoStore.currentOwner, repoStore.currentRepo, currentParams);
    const cached = cache.get(key);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.data;
    }

    try {
      const response = await getIssueList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        currentParams,
      );

      if (response.data) {
        // 写入缓存
        cache.set(key, {
          data: response.data,
          timestamp: Date.now(),
        });
        return response.data;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Issue 列表失败:', error);
      }
    }
    return [];
  };

  /**
   * 获取 Issue 列表（更新 UI）
   */
  const fetchIssueList = async (page?: number) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      issueList.value = [];
      return;
    }

    if (page) {
      filters.value.page = page;
    }

    loading.value = true;
    try {
      const data = await queryIssueList(filters.value.page);
      issueList.value = data;
    } finally {
      loading.value = false;
    }
  };

  // 获取 Issue 数量统计
  const fetchIssueCount = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return;
    }

    const key = `${repoStore.currentOwner}/${repoStore.currentRepo}`;
    countLoading.value = true;
    try {
      const response = await getIssueCount(repoStore.currentOwner, repoStore.currentRepo);
      if (response.data) {
        issueCountCache.value.set(key, response.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 Issue 数量失败:', error);
      }
      issueCountCache.value.delete(key);
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

        // 2. 重置筛选条件为 open
        resetFilters();

        // 3. 设置加载状态
        loading.value = true;

        // 4. 获取数量统计和数据
        await fetchIssueCount();
        await fetchIssueList();
      } else {
        issueList.value = [];
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
    queryIssueList,
    fetchIssueCount,
    updateFilters,
    resetFilters,
  };
});
