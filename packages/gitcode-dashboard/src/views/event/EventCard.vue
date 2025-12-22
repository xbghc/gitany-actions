<template>
  <el-card
    :class="['event-card', cardClasses, { clickable: !!event._links?.action_type }]"
    shadow="hover"
    @click="handleCardClick"
  >
    <!-- Push 事件内容 -->
    <template v-if="isPushEvent">
      <div class="push-description">
        <a :href="event.author.web_url" target="_blank" class="author-link" @click.stop>
          {{ event.author.name }}
        </a>
        {{ pushDescription }}
      </div>
      <div v-if="event.push_data?.commit_title" class="commit-title">
        {{ event.push_data.commit_title }}
      </div>
    </template>

    <!-- Download 事件内容 -->
    <template v-else-if="isDownloadEvent">
      <div class="download-text">
        <el-icon class="download-icon" :size="16"><Download /></el-icon>
        <a :href="event.author.web_url" target="_blank" class="author-link" @click.stop>
          {{ event.author.name }}
        </a>
        下载了仓库代码
      </div>
    </template>

    <!-- 每日下载汇总 -->
    <template v-else-if="isDailyDownloadSummary">
      <div class="daily-download-summary">
        <div class="summary-header" @click.stop="toggleExpanded">
          <div class="summary-left">
            <el-icon class="download-icon" :size="18"><Download /></el-icon>
            <span class="summary-date">{{ summaryDateText }}</span>
            <span class="summary-text"
              >下载 <strong> {{ dailySummary?.totalCount }} </strong> 次</span
            >
          </div>
          <div class="summary-right">
            <el-icon class="expand-icon" :class="{ expanded: isExpanded }"><ArrowDown /></el-icon>
          </div>
        </div>
        <div v-if="isExpanded" class="download-records">
          <div
            v-for="(record, index) in dailySummary?.records"
            :key="index"
            class="download-record"
          >
            <img
              v-if="record.author.avatar_url"
              :src="record.author.avatar_url"
              :alt="record.author.name"
              class="record-avatar"
            />
            <span v-else class="record-avatar-placeholder">{{ record.author.name.charAt(0) }}</span>
            <a :href="record.author.web_url" target="_blank" class="record-author" @click.stop>
              {{ record.author.name }}
            </a>
            <span class="record-time">{{ formatRecordTime(record.created_at) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- MergeRequest 事件内容 -->
    <template v-else-if="isMergeRequestEvent">
      <div class="mr-header">
        <div class="mr-left">
          <div class="mr-action">
            <a :href="event.author.web_url" target="_blank" class="author-link" @click.stop>
              {{ event.author.name }}
            </a>
            {{ mergeRequestAction }}
          </div>
          <div v-if="event.merge_request_info" class="branch-flow">
            <span class="source-branch">{{ event.merge_request_info.source_branch }}</span>
            <el-icon class="arrow-icon"><Right /></el-icon>
            <span class="target-branch">{{ event.merge_request_info.target_branch }}</span>
          </div>
        </div>
        <div v-if="event.target_iid" class="mr-number">!{{ event.target_iid }}</div>
      </div>

      <div v-if="displayTitle" class="mr-title">
        {{ displayTitle }}
      </div>

      <div v-if="event.note?.body" class="comment-content">
        <el-icon class="comment-icon"><ChatDotRound /></el-icon>
        <span class="comment-text">{{ event.note.body }}</span>
      </div>
    </template>

    <!-- 默认事件内容 -->
    <template v-else>
      <div v-if="displayTitle" class="event-title">
        {{ displayTitle }}
      </div>
      <div v-if="event.note?.body" class="comment-content">
        <el-icon class="comment-icon"><ChatDotRound /></el-icon>
        <span class="comment-text">{{ event.note.body }}</span>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChatDotRound, Right, Download, ArrowDown } from '@element-plus/icons-vue';
import type { EventItem } from '@/store/event';

const props = defineProps<{
  event: EventItem;
}>();

// 展开状态
const isExpanded = ref(false);

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

// 判断事件类型
const isPushEvent = computed(() => {
  const actionName = props.event.action_name.toLowerCase();
  return actionName.includes('push') && !!props.event.push_data;
});

const isDownloadEvent = computed(() => {
  return (
    props.event.action === 31 &&
    props.event.target_type === 'Repository' &&
    props.event.title === 'zip' &&
    !props.event.isDailyDownloadSummary
  );
});

const isDailyDownloadSummary = computed(() => {
  return !!props.event.isDailyDownloadSummary && !!props.event.dailyDownloadSummary;
});

const dailySummary = computed(() => {
  return props.event.dailyDownloadSummary;
});

const summaryDateText = computed(() => {
  if (!dailySummary.value) return '';
  // 格式化日期为 MM-DD
  const date = new Date(dailySummary.value.date);
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return dailySummary.value.isToday ? `今日(${dateStr})` : dateStr;
});

const formatRecordTime = (createdAt: string): string => {
  const date = new Date(createdAt);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isMergeRequestEvent = computed(() => {
  return props.event.target_type === 'MergeRequest' && !!props.event.merge_request_info;
});

// Push 描述
const pushDescription = computed(() => {
  if (!props.event.push_data) return '';
  const actionName = props.event.action_name.toLowerCase();
  const branch = props.event.push_data.ref;
  if (actionName.includes('new')) {
    return `推送到 ${branch} 分支（新）`;
  }
  return `推送到 ${branch} 分支`;
});

// MergeRequest 动作描述
const mergeRequestAction = computed(() => {
  if (!isMergeRequestEvent.value) return '';
  const actionName = props.event.action_name.toLowerCase();

  if (actionName === 'accepted' || props.event.action === 7) {
    return '合并了合并请求';
  }
  if (actionName === 'opened' || props.event.action === 2) {
    return '打开了合并请求';
  }
  if (actionName === 'created' || props.event.action === 1) {
    return '创建了合并请求';
  }
  if (actionName === 'closed' || props.event.action === 3) {
    return '关闭了合并请求';
  }
  return '更新了合并请求';
});

// 显示标题
const displayTitle = computed(() => {
  return props.event.target_title || props.event.title || props.event.action_name;
});

// 动态卡片类名
const cardClasses = computed(() => {
  if (isPushEvent.value) return 'push-card';
  if (isDownloadEvent.value || isDailyDownloadSummary.value) return 'download-card';
  if (isMergeRequestEvent.value) return 'merge-request-card';
  return 'default-card';
});

// 处理卡片点击
const handleCardClick = () => {
  const url = props.event._links?.action_type;
  if (url) {
    window.open(url, '_blank');
  }
};
</script>

<style scoped>
.event-card {
  transition: all 0.25s ease;
}

.event-card.clickable {
  cursor: pointer;
}

.event-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* el-card__body 布局 */
.event-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

/* Push 事件样式 */
.push-card :deep(.el-card__body) {
  background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
  border-left: 4px solid #2196f3;
}

.push-description {
  font-weight: 600;
  font-size: 15px;
  color: #1565c0;
}

.push-description .author-link {
  color: #1565c0;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
  margin-right: 4px;
}

.push-description .author-link:hover {
  color: #0d47a1;
  text-decoration: underline;
}

.commit-title {
  font-size: 13px;
  color: #555;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid rgba(33, 150, 243, 0.15);
}

/* Download 事件样式 */
.download-card :deep(.el-card__body) {
  background: linear-gradient(135deg, #f3e5f5 0%, #fafafa 100%);
  border-left: 4px solid #9c27b0;
}

.download-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #6a1b9a;
}

.download-icon {
  color: #7b1fa2;
  flex-shrink: 0;
}

.download-text .author-link {
  color: #6a1b9a;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.download-text .author-link:hover {
  color: #4a148c;
  text-decoration: underline;
}

/* 每日下载汇总样式 */
.daily-download-summary {
  width: 100%;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}

.summary-header:hover {
  opacity: 0.85;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-date {
  font-weight: 700;
  font-size: 15px;
  color: #6a1b9a;
}

.summary-text {
  font-size: 14px;
  color: #7b1fa2;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.download-count-tag {
  background-color: rgba(156, 39, 176, 0.2);
  color: #6a1b9a;
  border: none;
  font-weight: 600;
}

.expand-icon {
  color: #9c27b0;
  transition: transform 0.3s ease;
  font-size: 14px;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.download-records {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(156, 39, 176, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.download-record {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  font-size: 13px;
}

.record-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.record-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.record-author {
  color: #6a1b9a;
  text-decoration: none;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-author:hover {
  color: #4a148c;
  text-decoration: underline;
}

.record-time {
  color: #9c27b0;
  font-size: 12px;
  flex-shrink: 0;
}

/* MergeRequest 事件样式 */
.merge-request-card :deep(.el-card__body) {
  background: linear-gradient(135deg, #e8f5e9 0%, #f5f5f5 100%);
  border-left: 4px solid #4caf50;
}

.mr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mr-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: 8px;
}

.mr-action {
  font-weight: 500;
  font-size: 14px;
  color: #2e7d32;
}

.mr-action .author-link {
  color: #2e7d32;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
  margin-right: 4px;
}

.mr-action .author-link:hover {
  color: #1b5e20;
  text-decoration: underline;
}

.branch-flow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #2e7d32;
  font-weight: 500;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.source-branch,
.target-branch {
  background: rgba(76, 175, 80, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.arrow-icon {
  color: #4caf50;
  font-size: 12px;
  flex-shrink: 0;
}

.mr-title {
  font-size: 15px;
  font-weight: 600;
  color: #2e7d32;
  line-height: 1.5;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid rgba(76, 175, 80, 0.2);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mr-number {
  font-weight: 700;
  font-size: 13px;
  color: #1b5e20;
  background: rgba(76, 175, 80, 0.25);
  padding: 4px 10px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-right: 8px;
}

.comment-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  border-left: 3px solid #66bb6a;
  border-radius: 6px;
}

.comment-icon {
  font-size: 14px;
  color: #66bb6a;
  margin-top: 2px;
  flex-shrink: 0;
}

.comment-text {
  font-size: 13px;
  color: #424242;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* 默认事件样式 */

.event-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.default-card .comment-content {
  background-color: #f0f3f7;
  border-left: 3px solid #409eff;
}

.default-card .comment-icon {
  color: #409eff;
}

.default-card .comment-text {
  color: #606266;
}
</style>
