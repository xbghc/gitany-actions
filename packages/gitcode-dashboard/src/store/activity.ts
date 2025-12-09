import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { getRepoEvents } from '@/api';
import type {
  ActivityItem,
  ActivityFilterParams,
  RepoEvent,
  DailyDownloadSummary,
  DownloadRecord,
} from '@/types';
import { useRepoStore } from './repo';

interface CacheEntry {
  data: RepoEvent[];
  timestamp: number;
}

const TTL = 3 * 60 * 1000; // 3 minutes

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

  // 缓存
  const cache = new Map<string, CacheEntry>();

  /**
   * 生成缓存 Key
   */
  const getCacheKey = (owner: string, repo: string, params: ActivityFilterParams) => {
    // 确保参数顺序一致以保证缓存命中
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (obj, key) => {
          const value = params[key as keyof ActivityFilterParams];
          if (value !== undefined && value !== null) {
            obj[key] = String(value);
          }
          return obj;
        },
        {} as Record<string, string>,
      );
    const queryString = new URLSearchParams(sortedParams).toString();
    return `/api/repo/${owner}/${repo}/events?${queryString}`;
  };

  /**
   * 判断是否为下载事件
   */
  const isDownloadEvent = (event: RepoEvent): boolean => {
    return event.action === 31 && event.target_type === 'Repository' && event.title === 'zip';
  };

  /**
   * 获取日期字符串 (YYYY-MM-DD)
   */
  const getDateString = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  /**
   * 判断是否为今天
   */
  const isToday = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  /**
   * 按天合并下载事件
   * 返回：{ 非下载事件列表, 每日下载汇总Map }
   */
  const groupDownloadsByDay = (
    events: RepoEvent[],
  ): {
    nonDownloadEvents: RepoEvent[];
    dailySummaries: Map<string, DailyDownloadSummary>;
  } => {
    const nonDownloadEvents: RepoEvent[] = [];
    const dailySummaries = new Map<string, DailyDownloadSummary>();

    for (const event of events) {
      if (!isDownloadEvent(event)) {
        nonDownloadEvents.push(event);
        continue;
      }

      // 下载事件按天分组
      const dateStr = getDateString(event.created_at);
      const record: DownloadRecord = {
        author: event.author,
        created_at: event.created_at,
      };

      if (dailySummaries.has(dateStr)) {
        const summary = dailySummaries.get(dateStr)!;
        summary.totalCount++;
        summary.records.push(record);
      } else {
        dailySummaries.set(dateStr, {
          date: dateStr,
          isToday: isToday(dateStr),
          totalCount: 1,
          uniqueUserCount: 0, // 稍后计算
          records: [record],
        });
      }
    }

    // 计算每日独立用户数
    for (const summary of dailySummaries.values()) {
      const uniqueUsers = new Set(summary.records.map((r) => r.author.id));
      summary.uniqueUserCount = uniqueUsers.size;
      // 按时间倒序排序记录
      summary.records.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return { nonDownloadEvents, dailySummaries };
  };

  /**
   * 创建每日下载汇总的 ActivityItem
   */
  const createDailySummaryItem = (
    summary: DailyDownloadSummary,
    baseEvent: RepoEvent,
  ): ActivityItem => {
    return {
      ...baseEvent,
      id: `daily-download-${summary.date}`,
      isDailyDownloadSummary: true,
      dailyDownloadSummary: summary,
      icon: '📥',
      color: '#9c27b0',
    };
  };

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
   * 查询活动列表（带缓存）
   */
  const queryActivityList = async (
    owner: string,
    repo: string,
    params: ActivityFilterParams,
  ): Promise<RepoEvent[]> => {
    const key = getCacheKey(owner, repo, params);
    const cached = cache.get(key);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.data;
    }

    try {
      const response = await getRepoEvents(owner, repo, params);
      if (response.success && response.data) {
        // 写入缓存
        cache.set(key, {
          data: response.data.events,
          timestamp: Date.now(),
        });
        return response.data.events;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('获取活动列表失败:', error);
      }
    }
    return [];
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
      const events = await queryActivityList(owner, repo, filters.value);

      // 按天分组下载事件
      const { nonDownloadEvents, dailySummaries } = groupDownloadsByDay(events);

      // 转换非下载事件为 ActivityItem
      const nonDownloadItems = nonDownloadEvents.map(toActivityItem);

      // 创建每日下载汇总项，设置虚拟时间为当天最后时刻（确保排在当天其他事件之后）
      const summaryItems: ActivityItem[] = [];
      for (const [date, summary] of dailySummaries) {
        // 使用第一条下载记录作为基础事件
        const firstDownloadEvent = events.find(
          (e) => isDownloadEvent(e) && getDateString(e.created_at) === date,
        );
        if (firstDownloadEvent) {
          const summaryItem = createDailySummaryItem(summary, firstDownloadEvent);
          // 设置虚拟时间为当天 00:00:00（排序时会排在当天其他事件之后）
          summaryItem.created_at = `${date}T00:00:00.000Z`;
          summaryItems.push(summaryItem);
        }
      }

      // 合并并按时间倒序排序（最新的在前面）
      const newItems = [...nonDownloadItems, ...summaryItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      if (append) {
        activityList.value = [...activityList.value, ...newItems];
      } else {
        activityList.value = newItems;
      }

      // 判断是否还有更多数据
      // 如果返回的数据少于请求的数量，说明没有更多数据了
      hasMore.value = events.length >= (filters.value.per_page || 20);
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
    queryActivityList,
    fetchActivityList,
    refresh,
    updateFilters,
    changePage,
    loadMore,
  };
});
