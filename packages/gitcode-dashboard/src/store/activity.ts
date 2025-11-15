import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { getRepoEvents } from '@/api';
import type { ActivityItem, ActivityFilterParams, RepoEvent } from '@/types';
import { useRepoStore } from './repo';

export const useActivityStore = defineStore('activity', () => {
  const repoStore = useRepoStore();

  // 状态
  const activityList = ref<ActivityItem[]>([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const hasMore = ref(true);
  const filters = ref<ActivityFilterParams>({
    filter: 'all',
    page: 1,
    per_page: 20,
  });

  /**
   * 将 RepoEvent 转换为 ActivityItem
   */
  const toActivityItem = (event: RepoEvent): ActivityItem => {
    // 根据 action_name 设置图标和颜色
    const iconMap: Record<string, { icon: string; color: string }> = {
      push: { icon: '📤', color: '#409EFF' },
      merged: { icon: '🔀', color: '#67C23A' },
      issue: { icon: '📝', color: '#E6A23C' },
      comments: { icon: '💬', color: '#909399' },
      team: { icon: '👥', color: '#F56C6C' },
      project: { icon: '📁', color: '#409EFF' },
    };

    const actionType = event.action_name.toLowerCase();
    const iconInfo = iconMap[actionType] || { icon: '📌', color: '#909399' };

    return {
      ...event,
      id: `${event.project_id}-${event.created_at}-${event.author_id}`,
      icon: iconInfo.icon,
      color: iconInfo.color,
    };
  };

  /**
   * 获取活动列表
   * @param append 是否追加到现有列表（用于无限滚动）
   */
  const fetchActivityList = async (append = false) => {
    const selectedRepo = repoStore.selectedRepo;
    if (!selectedRepo) return;

    const { owner, repo } = selectedRepo;
    if (!owner || !repo) return;

    if (append) {
      loadingMore.value = true;
    } else {
      loading.value = true;
    }

    try {
      const response = await getRepoEvents(owner, repo, filters.value);
      if (response.success && response.data) {
        const newItems = response.data.events.map(toActivityItem);

        if (append) {
          activityList.value = [...activityList.value, ...newItems];
        } else {
          activityList.value = newItems;
        }

        // 判断是否还有更多数据
        // 如果返回的数据少于请求的数量，说明没有更多数据了
        hasMore.value = newItems.length >= (filters.value.per_page || 20);
      }
    } catch (error) {
      console.error('Failed to fetch activity list:', error);
      if (!append) {
        activityList.value = [];
      }
      hasMore.value = false;
    } finally {
      if (append) {
        loadingMore.value = false;
      } else {
        loading.value = false;
      }
    }
  };

  /**
   * 刷新列表
   */
  const refresh = () => {
    filters.value.page = 1;
    hasMore.value = true;
    fetchActivityList();
  };

  /**
   * 更新筛选条件
   */
  const updateFilters = (newFilters: Partial<ActivityFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    hasMore.value = true;
    fetchActivityList();
  };

  /**
   * 切换页码
   */
  const changePage = (page: number) => {
    filters.value.page = page;
    fetchActivityList();
  };

  /**
   * 加载更多数据（无限滚动）
   */
  const loadMore = async () => {
    if (loadingMore.value || !hasMore.value) {
      return;
    }

    filters.value.page = (filters.value.page || 1) + 1;
    await fetchActivityList(true);
  };

  // 监听仓库切换
  watch(
    () => repoStore.selectedRepo,
    async (newRepo) => {
      if (newRepo) {
        activityList.value = [];
        filters.value.page = 1;
        await fetchActivityList();
      }
    },
  );

  return {
    activityList,
    loading,
    loadingMore,
    hasMore,
    filters,
    fetchActivityList,
    refresh,
    updateFilters,
    changePage,
    loadMore,
  };
});
