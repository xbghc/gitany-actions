<template>
  <el-card class="activity-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <el-select
        v-model="currentFilter"
        placeholder="事件类型"
        style="width: 150px"
        @change="handleFilterChange"
      >
        <el-option label="全部" value="all" />
        <el-option label="Push" value="push" />
        <el-option label="Merged" value="merged" />
        <el-option label="Issue" value="issue" />
        <el-option label="评论" value="comments" />
        <el-option label="团队" value="team" />
        <el-option label="项目" value="project" />
      </el-select>

      <el-button :loading="activityStore.loading" @click="activityStore.refresh()">
        <template #icon>
          <el-icon><Refresh /></el-icon>
        </template>
        刷新
      </el-button>

      <span class="filter-info"> 共 {{ activityStore.activityList.length }} 条活动 </span>
    </div>

    <!-- 活动时间轴 -->
    <div v-loading="activityStore.loading" class="timeline-wrapper">
      <el-empty
        v-if="!activityStore.loading && activityStore.activityList.length === 0"
        description="暂无活动"
      />

      <el-timeline v-else class="activity-timeline">
        <el-timeline-item
          v-for="activity in activityStore.activityList"
          :key="activity.id"
          :color="getTimelineColor(activity)"
        >
          <div class="timestamp-toggle" @click="toggleTimeFormat()">
            {{ formatTimestamp(activity.created_at) }}
          </div>
          <ActivityCard :activity="activity" />
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- 分页 -->
    <div v-if="activityStore.activityList.length > 0" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="prev, pager, next, sizes"
        :total="1000"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useActivityStore } from '@/store';
import { useActivityTime } from './useActivityTime';
import ActivityCard from './ActivityCard.vue';
import type { RepoEvent } from '@/types';

const activityStore = useActivityStore();

// 筛选和分页状态
const currentFilter = ref<string>('all');
const currentPage = ref(1);
const pageSize = ref(20);

// 全局时间显示模式：所有时间戳统一显示
const timeDisplayMode = ref<'relative' | 'absolute'>('relative');

// 获取 timeline 节点颜色
const getTimelineColor = (activity: RepoEvent): string => {
  // Push 事件
  if (activity.action_name.toLowerCase().includes('push') && activity.push_data) {
    return '#2196f3'; // 蓝色
  }
  // Download 事件
  if (activity.action === 31 && activity.target_type === 'Repository' && activity.title === 'zip') {
    return '#9c27b0'; // 紫色
  }
  // MergeRequest 事件
  if (activity.target_type === 'MergeRequest' && activity.merge_request_info) {
    return '#4caf50'; // 绿色
  }
  // 默认
  return '#909399'; // 灰色
};

// 格式化时间戳
const formatTimestamp = (createdAt: string): string => {
  if (timeDisplayMode.value === 'relative') {
    // 相对时间
    const timeAgo = useActivityTime(() => new Date(createdAt));
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
  activityStore.updateFilters({ filter: filter as any, page: 1 });
  currentPage.value = 1;
};

// 处理页码变化
const handlePageChange = (page: number) => {
  activityStore.changePage(page);
};

// 处理每页数量变化
const handleSizeChange = (size: number) => {
  activityStore.updateFilters({ per_page: size, page: 1 });
  currentPage.value = 1;
};

// 初始化
onMounted(() => {
  activityStore.fetchActivityList();
});
</script>

<style scoped>
.activity-container {
  height: 100%;
  display: flex;
  flex-direction: column;
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
}

.activity-timeline {
  padding-left: 20px;
}

.activity-timeline :deep(.el-timeline-item) {
  padding-bottom: 20px;
}

.activity-timeline :deep(.el-timeline-item:last-child) {
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

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}
</style>
