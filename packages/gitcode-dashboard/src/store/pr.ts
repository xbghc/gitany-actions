import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PullRequest, PRFilterParams, PrCount } from '@/types';
import { getPRList, getPRCount } from '@/api';
import { useRepoStore } from './repo';
import {
  generateCacheKey,
  getCache,
  setCache,
  getCacheItem,
  getMergedCache,
  clearCacheByType,
} from '@/utils/swrCache';

export const usePRStore = defineStore('pr', () => {
  const repoStore = useRepoStore();

  // PR 列表
  const prList = ref<PullRequest[]>([]);
  const loading = ref(false);

  // PR 数量统计
  const prCount = ref<PrCount | null>(null);
  const countLoading = ref(false);

  // 筛选参数
  const filters = ref<PRFilterParams>({
    state: 'all',
    page: 1,
    per_page: 20,
  });

  /**
   * 获取 PR 列表（仅读缓存模式）
   * 优先从缓存读取，无缓存才发起网络请求
   */
  const fetchPRList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      prList.value = [];
      return;
    }

    // 1. 生成缓存键
    const cacheKey = generateCacheKey({
      type: 'pr',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
      page: filters.value.page || 1,
      per_page: filters.value.per_page || 20,
      state: filters.value.state || 'all',
    });

    // 2. 尝试从缓存读取
    const cached = await getCache<PullRequest[]>(cacheKey);
    if (cached) {
      // 有缓存：立即显示，不发起网络请求
      prList.value = cached;
      loading.value = false;
      return;
    }

    // 3. 无缓存：发起网络请求
    loading.value = true;
    try {
      const response = await getPRList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        filters.value
      );
      if (response.data) {
        prList.value = response.data;
        // 更新缓存（不等待完成），记录最新的 updated_at
        const latestUpdatedAt = response.data[0]?.updated_at;
        setCache(cacheKey, response.data, latestUpdatedAt);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 PR 列表失败:', error);
      }
      prList.value = [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 增量更新 PR 列表
   * 按 updated_at 排序获取数据，直到遇到已缓存的 updated_at
   * @param silent 静默模式，不显示 loading 状态
   */
  const refreshWithIncremental = async (silent = false): Promise<boolean> => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return false;
    }

    // 获取当前第一页的缓存项（包含 lastUpdatedAt）
    const firstPageKey = generateCacheKey({
      type: 'pr',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
      page: 1,
      per_page: filters.value.per_page || 20,
      state: filters.value.state || 'all',
    });

    const firstPageCache = await getCacheItem<PullRequest[]>(firstPageKey);

    // 3. 如果没有缓存，执行完整加载
    if (!firstPageCache || !firstPageCache.data || firstPageCache.data.length === 0) {
      await fetchPRList();
      return true;
    }

    const lastUpdatedAt = firstPageCache.lastUpdatedAt;

    // 4. 按 updated_at 排序获取新数据
    const updatedItems: PullRequest[] = [];
    let page = 1;
    let shouldContinue = true;

    if (!silent) {
      loading.value = true;
    }

    try {
      while (shouldContinue) {
        const response = await getPRList(
          repoStore.currentOwner,
          repoStore.currentRepo,
          {
            ...filters.value,
            page,
            sort: 'updated', // 强制按 updated_at 排序
            direction: 'desc',
          }
        );

        if (!response.data || response.data.length === 0) {
          break;
        }

        // 检查每一项
        for (const item of response.data) {
          // 如果遇到相同的 updated_at，停止获取
          if (lastUpdatedAt && item.updated_at === lastUpdatedAt) {
            shouldContinue = false;
            break;
          }
          updatedItems.push(item);
        }

        page++;

        // 安全限制：最多获取 10 页
        if (page > 10) {
          break;
        }
      }

      // 5. 如果没有更新，从缓存读取当前页
      if (updatedItems.length === 0) {
        const currentPageKey = generateCacheKey({
          type: 'pr',
          owner: repoStore.currentOwner,
          repo: repoStore.currentRepo,
          page: filters.value.page || 1,
          per_page: filters.value.per_page || 20,
          state: filters.value.state || 'all',
        });
        const currentPageCache = await getCache<PullRequest[]>(currentPageKey);
        if (currentPageCache) {
          prList.value = currentPageCache;
        }
        return false;
      }

      // 6. 合并数据
      const mergedData = await mergeAndRepaginate(updatedItems);

      // 7. 更新当前页显示
      const currentPage = filters.value.page || 1;
      const perPage = filters.value.per_page || 20;
      const startIndex = (currentPage - 1) * perPage;
      prList.value = mergedData.slice(startIndex, startIndex + perPage);

      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('增量更新失败:', error);
      }
      // 失败时回退到完整加载
      await fetchPRList();
      return false;
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  };

  /**
   * 合并更新的数据并重新分页存储
   */
  const mergeAndRepaginate = async (updatedItems: PullRequest[]): Promise<PullRequest[]> => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return [];
    }

    const baseCachePrefix = `swr_pr_${repoStore.currentOwner}_${repoStore.currentRepo}_${filters.value.state || 'all'}`;

    // 1. 获取所有已缓存的数据
    const cachedData = await getMergedCache<PullRequest>(baseCachePrefix);

    // 2. 创建 ID -> PR 的映射
    const itemMap = new Map<number, PullRequest>();

    // 先添加缓存的数据
    cachedData.forEach(item => {
      itemMap.set(item.id, item);
    });

    // 用新数据覆盖（更新或新增）
    updatedItems.forEach(item => {
      itemMap.set(item.id, item);
    });

    // 3. 转换为数组并按 updated_at 降序排序
    const allItems = Array.from(itemMap.values()).sort((a, b) => {
      const timeA = new Date(a.updated_at || 0).getTime();
      const timeB = new Date(b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    // 4. 筛选符合当前状态的数据
    const filteredItems = allItems.filter(item => {
      if (filters.value.state === 'all') return true;
      return item.state === filters.value.state;
    });

    // 5. 按页重新存储到缓存
    const perPage = filters.value.per_page || 20;
    const totalPages = Math.ceil(filteredItems.length / perPage);

    for (let page = 1; page <= totalPages; page++) {
      const startIndex = (page - 1) * perPage;
      const pageData = filteredItems.slice(startIndex, startIndex + perPage);

      const cacheKey = generateCacheKey({
        type: 'pr',
        owner: repoStore.currentOwner,
        repo: repoStore.currentRepo,
        page,
        per_page: perPage,
        state: filters.value.state || 'all',
      });

      // 记录该页最新的 updated_at
      const latestUpdatedAt = pageData[0]?.updated_at;
      await setCache(cacheKey, pageData, latestUpdatedAt);
    }

    return filteredItems;
  };

  /**
   * 首次访问：优先显示第1页，后台全量预取所有页
   */
  const fetchWithPrefetchAll = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return;
    }

    // 1. 优先获取并显示第1页
    filters.value.page = 1;
    await fetchPRList();

    // 2. 后台全量预取所有页
    prefetchAllPages();
  };

  /**
   * 后台预取所有页面
   */
  const prefetchAllPages = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo || !prCount.value) {
      return;
    }

    const perPage = filters.value.per_page || 20;

    // 根据当前筛选状态获取总数
    let total = 0;
    switch (filters.value.state) {
      case 'open':
        total = prCount.value.opened || 0;
        break;
      case 'closed':
        total = prCount.value.closed || 0;
        break;
      case 'merged':
        total = prCount.value.merged || 0;
        break;
      case 'all':
      default:
        total = prCount.value.all || 0;
    }

    const totalPages = Math.ceil(total / perPage);

    // 从第2页开始预取（第1页已经获取并显示）
    for (let page = 2; page <= totalPages; page++) {
      try {
        const response = await getPRList(
          repoStore.currentOwner,
          repoStore.currentRepo,
          {
            ...filters.value,
            page,
          }
        );
        if (response.data) {
          const cacheKey = generateCacheKey({
            type: 'pr',
            owner: repoStore.currentOwner,
            repo: repoStore.currentRepo,
            page,
            per_page: perPage,
            state: filters.value.state || 'all',
          });
          const latestUpdatedAt = response.data[0]?.updated_at;
          await setCache(cacheKey, response.data, latestUpdatedAt);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug(`预取第 ${page} 页失败:`, error);
        }
      }
    }
  };

  /**
   * 刷新按钮：先显示当前页，后台全量重新获取
   */
  const refreshFullData = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      return;
    }

    const currentPage = filters.value.page || 1;

    // 1. 优先获取并显示当前页
    loading.value = true;
    try {
      const response = await getPRList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        filters.value
      );
      if (response.data) {
        prList.value = response.data;
        const latestUpdatedAt = response.data[0]?.updated_at;
        const cacheKey = generateCacheKey({
          type: 'pr',
          owner: repoStore.currentOwner,
          repo: repoStore.currentRepo,
          page: currentPage,
          per_page: filters.value.per_page || 20,
          state: filters.value.state || 'all',
        });
        await setCache(cacheKey, response.data, latestUpdatedAt);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('刷新当前页失败:', error);
      }
    } finally {
      loading.value = false;
    }

    // 2. 清除当前状态的所有缓存
    await clearCacheByType('pr', repoStore.currentOwner, repoStore.currentRepo);

    // 3. 后台全量重新获取所有页
    prefetchAllPages();

    // 4. 重新获取数量统计
    fetchPRCount();
  };

  // 获取 PR 数量统计
  const fetchPRCount = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      prCount.value = null;
      return;
    }

    countLoading.value = true;
    try {
      const response = await getPRCount(
        repoStore.currentOwner,
        repoStore.currentRepo
      );
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
      type: 'pr',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
      page,
      per_page: perPage,
      state: filters.value.state || 'all',
    });

    // 如果已经有缓存，不重复请求
    const cached = await getCache<PullRequest[]>(cacheKey);
    if (cached) {
      return;
    }

    // 静默请求指定页数据
    try {
      const response = await getPRList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        {
          ...filters.value,
          page,
        }
      );
      if (response.data) {
        const latestUpdatedAt = response.data[0]?.updated_at;
        setCache(cacheKey, response.data, latestUpdatedAt);
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
    if (!prCount.value) {
      return;
    }

    const currentPage = filters.value.page || 1;
    const perPage = filters.value.per_page || 20;

    // 根据当前筛选状态获取总数
    let total = 0;
    switch (filters.value.state) {
      case 'open':
        total = prCount.value.opened || 0;
        break;
      case 'closed':
        total = prCount.value.closed || 0;
        break;
      case 'merged':
        total = prCount.value.merged || 0;
        break;
      case 'all':
      default:
        total = prCount.value.all || 0;
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
    async (newRepoId) => {
      if (newRepoId) {
        // 重置筛选条件
        resetFilters();
        // 先获取数量统计（用于计算总页数）
        await fetchPRCount();
        // 首次访问：优先第1页 + 后台全量预取
        await fetchWithPrefetchAll();
      } else {
        // 清空列表并重置 loading 状态
        prList.value = [];
        prCount.value = null;
        loading.value = false;
      }
    },
    { immediate: true }
  );

  return {
    prList,
    loading,
    filters,
    prCount,
    countLoading,
    fetchPRList,
    fetchPRCount,
    updateFilters,
    resetFilters,
    prefetchNextPage,
    prefetchPage,
    refreshWithIncremental,
    fetchWithPrefetchAll,
    refreshFullData,
  };
});
