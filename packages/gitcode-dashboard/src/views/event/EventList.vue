<template>
  <div class="event-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <el-select
        v-model="currentFilter"
        :placeholder="t('event.type_placeholder')"
        style="width: 150px"
        @change="handleFilterChange"
      >
        <el-option :label="t('event.all')" value="all" />
        <el-option :label="t('event.push')" value="push" />
        <el-option :label="t('event.merged')" value="merged" />
        <el-option :label="t('event.issue')" value="issue" />
        <el-option :label="t('event.comments')" value="comments" />
        <el-option :label="t('event.team')" value="team" />
        <el-option :label="t('event.project')" value="project" />
      </el-select>

      <el-button :loading="eventStore.loading" @click="eventStore.refresh()">
        <template #icon>
          <el-icon><Refresh /></el-icon>
        </template>
        {{ t('event.refresh') }}
      </el-button>

      <span class="filter-info">
        {{ t('event.total_events', { count: eventStore.eventList.length }) }}
      </span>
    </div>

    <!-- 事件时间轴 -->
    <div ref="timelineWrapperRef" v-loading="eventStore.loading" class="timeline-wrapper">
      <el-empty
        v-if="!eventStore.loading && eventStore.eventList.length === 0"
        :description="t('event.no_event')"
      />

      <el-timeline v-else class="event-timeline">
        <el-timeline-item
          v-for="event in eventStore.eventList"
          :key="event.id"
          :color="getTimelineColor(event)"
        >
          <div class="timestamp-toggle" @click="toggleTimeFormat()">
            {{ formatTimestamp(event.created_at) }}
          </div>
          <EventCard :repo-event="event" />
        </el-timeline-item>
      </el-timeline>

      <!-- 加载更多提示 -->
      <div v-if="eventStore.eventList.length > 0" class="loading-more">
        <el-text v-if="eventStore.loadingMore" type="info">
          <el-icon class="is-loading"><Loading /></el-icon>
          {{ t('event.loading') }}
        </el-text>
        <el-text v-else-if="!eventStore.hasMore" type="info">
          {{ t('event.no_more') }}
        </el-text>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh, Loading } from '@element-plus/icons-vue';
import { useInfiniteScroll } from '@vueuse/core';
import { useEventStore } from '@/store';
import { useEventTime } from './useEventTime';
import EventCard from './EventCard.vue';
import type { EventItem } from '@/store/event';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const eventStore = useEventStore();

// timeline-wrapper 容器引用
const timelineWrapperRef = ref<HTMLElement | null>(null);

// 筛选状态
const currentFilter = ref<string>('all');

// 全局时间显示模式：所有时间戳统一显示
const timeDisplayMode = ref<'relative' | 'absolute'>('relative');

// 获取 timeline 节点颜色
const getTimelineColor = (event: EventItem): string => {
  // Push 事件
  if (event.action_name.toLowerCase().includes('push') && event.push_data) {
    return '#2196f3'; // 蓝色
  }
  // 每日下载汇总
  if (event.isDailyDownloadSummary) {
    return '#9c27b0'; // 紫色
  }
  // Download 事件
  if (event.action === 31 && event.target_type === 'Repository' && event.title === 'zip') {
    return '#9c27b0'; // 紫色
  }
  // MergeRequest 事件
  if (event.target_type === 'MergeRequest' && event.merge_request_info) {
    return '#4caf50'; // 绿色
  }
  // 默认
  return '#909399'; // 灰色
};

// 格式化时间戳
const formatTimestamp = (createdAt: string): string => {
  if (timeDisplayMode.value === 'relative') {
    // 相对时间
    const timeAgo = useEventTime(() => new Date(createdAt));
    return timeAgo.value;
  } else {
    // 绝对时间
    const date = new Date(createdAt);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};

// 切换时间格式（全局切换）
const toggleTimeFormat = () => {
  timeDisplayMode.value = timeDisplayMode.value === 'relative' ? 'absolute' : 'relative';
};

// 处理筛选变化
const handleFilterChange = (filter: string) => {
  eventStore.updateFilters({ filter: filter as any, page: 1 });
};

// 无限滚动
useInfiniteScroll(
  timelineWrapperRef,
  () => {
    if (!eventStore.loadingMore && eventStore.hasMore) {
      eventStore.loadMore();
    }
  },
  {
    distance: 500, // 提前 500px 触发
    interval: 100, // 节流间隔
  },
);

// 初始化
onMounted(() => {
  eventStore.fetchEventList();
});
</script>

<style scoped>
.event-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-info {
  color: #909399;
  font-size: 14px;
  margin-left: auto;
}

.timeline-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  min-height: 0;
}

.event-timeline {
  padding-left: 20px;
}

.event-timeline :deep(.el-timeline-item) {
  padding-bottom: 20px;
}

.event-timeline :deep(.el-timeline-item:last-child) {
  padding-bottom: 0;
}

.timestamp-toggle {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.timestamp-toggle:hover {
  color: #409eff;
  text-decoration: none;
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}
</style>
