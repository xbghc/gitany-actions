import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PullRequest, PRFilterParams, PrCount } from '@/types';
import { getPRList, getPRCount } from '@/api';
import { useRepoStore } from './repo';
import {
  generateSimpleCacheKey,
  getCache,
  setCache,
  deleteCache,
  type RepoCache,
} from '@/utils/swrCache';

export const usePRStore = defineStore('pr', () => {
  const repoStore = useRepoStore();

  // PR 列表（当前显示）
  const prList = ref<PullRequest[]>([]);
  const loading = ref(false);

  // 完整 PR 列表（缓存）
  const allPRs = ref<PullRequest[]>([]);

  // 缓存进度
  const cacheProgress = ref({
    lastFetchedPage: 0,
    isComplete: false,
  });

  // PR 数量统计
  const prCount = ref<PrCount | null>(null);
  const countLoading = ref(false);

  // 筛选参数（默认 open 状态，降序）
  const filters = ref<PRFilterParams>({
    state: 'open',
    page: 1,
    per_page: 20,
    sort: 'updated',
    direction: 'desc',
  });

  /**
   * 加载仓库缓存
   */
  const loadCache = async (): Promise<boolean> => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return false;

    const cacheKey = generateSimpleCacheKey({
      type: 'pr',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
    });

    const cached = await getCache<RepoCache<PullRequest>>(cacheKey);
    if (cached) {
      allPRs.value = cached.items;
      cacheProgress.value = {
        lastFetchedPage: cached.lastFetchedPage,
        isComplete: cached.isComplete,
      };
      return true;
    }
    return false;
  };

  /**
   * 保存缓存
   */
  const saveCache = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return;

    const cacheKey = generateSimpleCacheKey({
      type: 'pr',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
    });

    const cacheData: RepoCache<PullRequest> = {
      items: allPRs.value,
      lastFetchedPage: cacheProgress.value.lastFetchedPage,
      isComplete: cacheProgress.value.isComplete,
      timestamp: Date.now(),
    };

    await setCache(cacheKey, cacheData);
  };

  /**
   * 从缓存显示数据（降序）
   */
  const displayFromCache = () => {
    // 1. 筛选状态
    let filtered = allPRs.value;
    if (filters.value.state !== 'all') {
      filtered = allPRs.value.filter(pr => pr.state === filters.value.state);
    }

    // 2. 降序排序（最新的在前）
    const sorted = [...filtered].sort((a, b) =>
      new Date(b.updated_at || 0).getTime() -
      new Date(a.updated_at || 0).getTime()
    );

    // 3. 分页
    const page = filters.value.page || 1;
    const perPage = filters.value.per_page || 20;
    const start = (page - 1) * perPage;
    prList.value = sorted.slice(start, start + perPage);
  };

  /**
   * 获取 PR 列表
   * 优先从缓存读取，无缓存才发起网络请求
   */
  const fetchPRList = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) {
      loading.value = false;
      prList.value = [];
      return;
    }

    // 1. 加载缓存
    const hasCache = await loadCache();

    if (hasCache && allPRs.value.length > 0) {
      // 2. 从缓存显示（降序）
      displayFromCache();
      loading.value = false;

      // 3. 后台继续/补全缓存
      if (!cacheProgress.value.isComplete) {
        continueFetchingCache(); // 不 await，后台执行
      } else {
        checkForUpdates(); // 不 await，后台执行
      }
      return;
    }

    // 无缓存：先获取第一页给用户看（降序）
    loading.value = true;
    try {
      const response = await getPRList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        {
          page: 1,
          per_page: 20,
          sort: 'updated',
          direction: 'desc',
        }
      );

      if (response.data) {
        prList.value = response.data;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取 PR 列表失败:', error);
      }
      prList.value = [];
    } finally {
      loading.value = false;
    }

    // 启动后台缓存（升序）
    startBackgroundCaching();
  };

  /**
   * 后台继续缓存（从上次页码继续，升序）
   */
  const continueFetchingCache = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return;

    const perPage = 100;
    let currentPage = cacheProgress.value.lastFetchedPage + 1;

    while (!cacheProgress.value.isComplete) {
      try {
        const response = await getPRList(
          repoStore.currentOwner,
          repoStore.currentRepo,
          {
            page: currentPage,
            per_page: perPage,
            sort: 'updated',
            direction: 'asc', // 升序：从旧到新
          }
        );

        if (!response.data || response.data.length === 0) {
          cacheProgress.value.isComplete = true;
          await saveCache();
          break;
        }

        // 合并到缓存（使用 Map 去重）
        const itemMap = new Map(allPRs.value.map(pr => [pr.id, pr]));
        response.data.forEach(pr => itemMap.set(pr.id, pr));
        allPRs.value = Array.from(itemMap.values());

        // 更新进度
        cacheProgress.value.lastFetchedPage = currentPage;
        await saveCache();

        // 更新显示
        displayFromCache();

        // 如果返回的数据少于请求的数量，说明已经到底了
        if (response.data.length < perPage) {
          cacheProgress.value.isComplete = true;
          await saveCache();
          break;
        }

        currentPage++;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`缓存第 ${currentPage} 页失败:`, error);
        }
        break;
      }
    }
  };

  /**
   * 启动后台缓存（从第1页开始，升序）
   */
  const startBackgroundCaching = () => {
    cacheProgress.value = {
      lastFetchedPage: 0,
      isComplete: false,
    };
    continueFetchingCache();
  };

  /**
   * 检查更新（缓存已完成时）
   */
  const checkForUpdates = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return;

    try {
      const response = await getPRList(
        repoStore.currentOwner,
        repoStore.currentRepo,
        {
          page: 1,
          per_page: 100,
          sort: 'updated',
          direction: 'desc',
        }
      );

      if (!response.data || response.data.length === 0) return;

      // 找到缓存中最新的 updated_at
      const cachedLatest = allPRs.value.reduce((latest, pr) => {
        const prTime = new Date(pr.updated_at || 0).getTime();
        return prTime > latest ? prTime : latest;
      }, 0);

      // 找出比缓存更新的数据
      const newItems = response.data.filter(pr =>
        new Date(pr.updated_at || 0).getTime() > cachedLatest
      );

      if (newItems.length > 0) {
        // 合并到缓存
        const itemMap = new Map(allPRs.value.map(pr => [pr.id, pr]));
        newItems.forEach(pr => itemMap.set(pr.id, pr));
        allPRs.value = Array.from(itemMap.values());

        await saveCache();
        displayFromCache();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('检查更新失败:', error);
      }
    }
  };

  /**
   * 清空当前仓库的缓存
   */
  const clearCache = async () => {
    if (!repoStore.currentOwner || !repoStore.currentRepo) return;

    const cacheKey = generateSimpleCacheKey({
      type: 'pr',
      owner: repoStore.currentOwner,
      repo: repoStore.currentRepo,
    });

    // 删除缓存
    await deleteCache(cacheKey);

    // 重置状态
    allPRs.value = [];
    cacheProgress.value = {
      lastFetchedPage: 0,
      isComplete: false,
    };
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

  // 更新筛选条件（只需重新显示，数据已在内存中）
  const updateFilters = (newFilters: Partial<PRFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    displayFromCache();
  };

  // 监听 filters 变化，自动重新显示
  watch(
    () => [filters.value.state, filters.value.page, filters.value.per_page],
    () => {
      if (allPRs.value.length > 0) {
        displayFromCache();
      }
    }
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
        allPRs.value = [];
        prCount.value = null;
        cacheProgress.value = {
          lastFetchedPage: 0,
          isComplete: false,
        };

        // 2. 重置筛选条件为 open
        resetFilters();

        // 3. 尝试从缓存读取新仓库数据
        const hasCache = await loadCache();
        if (hasCache && allPRs.value.length > 0) {
          displayFromCache();
          loading.value = false;
        } else {
          loading.value = true;
        }

        // 4. 后台获取数量统计和刷新数据
        await fetchPRCount();
        await fetchPRList();
      } else {
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
    clearCache,
    updateFilters,
    resetFilters,
  };
});
