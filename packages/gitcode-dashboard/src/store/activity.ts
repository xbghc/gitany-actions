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
   */
  const fetchActivityList = async () => {
    const selectedRepo = repoStore.selectedRepo;
    if (!selectedRepo) return;

    const { owner, repo } = selectedRepo;
    if (!owner || !repo) return;

    loading.value = true;

    try {
      const response = await getRepoEvents(owner, repo, filters.value);
      if (response.success && response.data) {
        activityList.value = response.data.events.map(toActivityItem);
      }
    } catch (error) {
      console.error('Failed to fetch activity list:', error);
      activityList.value = [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 刷新列表
   */
  const refresh = () => {
    filters.value.page = 1;
    fetchActivityList();
  };

  /**
   * 更新筛选条件
   */
  const updateFilters = (newFilters: Partial<ActivityFilterParams>) => {
    filters.value = { ...filters.value, ...newFilters };
    fetchActivityList();
  };

  /**
   * 切换页码
   */
  const changePage = (page: number) => {
    filters.value.page = page;
    fetchActivityList();
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
    filters,
    fetchActivityList,
    refresh,
    updateFilters,
    changePage,
  };
});
