import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PullRequest, PRFilterParams, PrCount } from '@/types';
import { getPRList, getPRCount } from '@/api';
import { useRepoStore } from './repo';

interface CacheEntry {
  data: PullRequest[];
  timestamp: number;
}

const TTL = 3 * 60 * 1000; // 3 minutes

export const usePRStore = defineStore('pr', () => {
  const repoStore = useRepoStore();

  // PR 列表（当前显示）
  const prList = ref<PullRequest[]>([]);
  const loading = ref(false);

  // 缓存
  const cache = new Map<string, CacheEntry>();

  // PR 数量统计
  const prCount = ref<PrCount | null>(null);
  const countLoading = ref(false);

  // 筛选参数（默认 open 状态，降序）
  const filters = ref<PRFilterParams>({
    state: 'open',
    page: 1,
    per_page: 10,
    sort: 'updated',
    direction: 'desc',
  });

  /**
   * 生成缓存 Key
   */
  const getCacheKey = (owner: string, repo: string, params: PRFilterParams) => {
    // 确保参数顺序一致以保证缓存命中
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        const value = params[key as keyof PRFilterParams];
        if (value !== undefined && value !== null) {
          obj[key] = String(value);
        }
        return obj;
      }, {} as Record<string, string>);
    const queryString = new URLSearchParams(sortedParams).toString();
    return `/api/repo/${owner}/${repo}/pulls?${queryString}`;
  };

  /**
   * 查询 PR 列表（带缓存）
   * @param page 可选页码，如果不传则使用当前 filters 中的 page
   */
  const queryPRList = async (page?: number) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return [];
    }

    const currentParams: PRFilterParams = { ...filters.value };
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
      const response = await getPRList(
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
        console.error('获取 PR 列表失败:', error);
      }
    }
    return [];
  };

  /**
   * 获取 PR 列表（更新 UI）
   */
  const fetchPRList = async (page?: number) => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      prList.value = [];
      return;
    }

    if (page) {
      filters.value.page = page;
    }

    loading.value = true;
    try {
      const data = await queryPRList(filters.value.page);
      prList.value = data;
    } finally {
      loading.value = false;
    }
  };

  // 获取 PR 数量统计
  const fetchPRCount = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      prCount.value = null;
      return;
    }

    countLoading.value = true;
    try {
      const response = await getPRCount(repoStore.currentOwner, repoStore.currentRepo);
      if (response.data) {
        prCount.value = response.data;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 PR 数量失败:', error);
      }
      prCount.value = null;
    } finally {
      countLoading.value = false;
    }
  };

  // 更新筛选条件并重新获取数据
  const updateFilters = (newFilters: Partial<PRFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    fetchPRList();
  };

  // 监听 filters 变化，自动重新获取
  watch(
    () => [filters.value.state, filters.value.page, filters.value.per_page],
    () => {
      fetchPRList();
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
        prList.value = [];
        prCount.value = null;

        // 2. 重置筛选条件为 open
        resetFilters();

        // 3. 设置加载状态
        loading.value = true;

        // 4. 获取数量统计和数据
        await fetchPRCount();
        await fetchPRList();
      } else {
        prList.value = [];
        prCount.value = null;
        loading.value = false;
      }
    },
    { immediate: true },
  );

  return {
    prList,
    loading,
    filters,
    prCount,
    countLoading,
    fetchPRList,
    queryPRList,
    fetchPRCount,
    updateFilters,
    resetFilters,
  };
});
