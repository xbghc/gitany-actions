<template>
  <el-card
    :class="['activity-card', cardClasses, { clickable: !!activity._links?.action_type }]"
    shadow="hover"
    @click="handleCardClick"
  >
    <!-- Push 事件内容 -->
    <template v-if="isPushEvent">
      <div class="push-description">
        <a :href="activity.author.web_url" target="_blank" class="author-link" @click.stop>
          {{ activity.author.name }}
        </a>
        {{ pushDescription }}
      </div>
      <div v-if="activity.push_data?.commit_title" class="commit-title">
        {{ activity.push_data.commit_title }}
      </div>
    </template>

    <!-- Download 事件内容 -->
    <template v-else-if="isDownloadEvent">
      <div class="download-text">
        <el-icon class="download-icon" :size="16"><Download /></el-icon>
        <a :href="activity.author.web_url" target="_blank" class="author-link" @click.stop>
          {{ activity.author.name }}
        </a>
        下载了仓库代码
      </div>
    </template>

    <!-- MergeRequest 事件内容 -->
    <template v-else-if="isMergeRequestEvent">
      <div class="mr-action">
        <a :href="activity.author.web_url" target="_blank" class="author-link" @click.stop>
          {{ activity.author.name }}
        </a>
        {{ mergeRequestAction }}
      </div>

      <div v-if="displayTitle" class="mr-title">
        {{ displayTitle }}
      </div>
      <div v-if="activity.merge_request_info" class="mr-details">
        <div class="branch-flow">
          <span class="source-branch">{{ activity.merge_request_info.source_branch }}</span>
          <el-icon class="arrow-icon"><Right /></el-icon>
          <span class="target-branch">{{ activity.merge_request_info.target_branch }}</span>
        </div>
        <div v-if="activity.target_iid" class="mr-number">!{{ activity.target_iid }}</div>
      </div>
      <div v-if="activity.note?.body" class="comment-content">
        <el-icon class="comment-icon"><ChatDotRound /></el-icon>
        <span class="comment-text">{{ activity.note.body }}</span>
      </div>
    </template>

    <!-- 默认事件内容 -->
    <template v-else>
      <div v-if="displayTitle" class="activity-title">
        {{ displayTitle }}
      </div>
      <div v-if="activity.note?.body" class="comment-content">
        <el-icon class="comment-icon"><ChatDotRound /></el-icon>
        <span class="comment-text">{{ activity.note.body }}</span>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChatDotRound, Right, Download } from '@element-plus/icons-vue';
import type { RepoEvent } from '@/types';

const props = defineProps<{
  activity: RepoEvent;
}>();

// 判断事件类型
const isPushEvent = computed(() => {
  const actionName = props.activity.action_name.toLowerCase();
  return actionName.includes('push') && !!props.activity.push_data;
});

const isDownloadEvent = computed(() => {
  return (
    props.activity.action === 31 &&
    props.activity.target_type === 'Repository' &&
    props.activity.title === 'zip'
  );
});

const isMergeRequestEvent = computed(() => {
  return props.activity.target_type === 'MergeRequest' && !!props.activity.merge_request_info;
});

// Push 描述
const pushDescription = computed(() => {
  if (!props.activity.push_data) return '';
  const actionName = props.activity.action_name.toLowerCase();
  const branch = props.activity.push_data.ref;
  if (actionName.includes('new')) {
    return `推送到 ${branch} 分支（新）`;
  }
  return `推送到 ${branch} 分支`;
});

// MergeRequest 动作描述
const mergeRequestAction = computed(() => {
  if (!isMergeRequestEvent.value) return '';
  const actionName = props.activity.action_name.toLowerCase();

  if (actionName === 'accepted' || props.activity.action === 7) {
    return '合并了合并请求';
  }
  if (actionName === 'opened' || props.activity.action === 2) {
    return '打开了合并请求';
  }
  if (actionName === 'created' || props.activity.action === 1) {
    return '创建了合并请求';
  }
  if (actionName === 'closed' || props.activity.action === 3) {
    return '关闭了合并请求';
  }
  return '更新了合并请求';
});

// 显示标题
const displayTitle = computed(() => {
  return props.activity.target_title || props.activity.title || props.activity.action_name;
});

// 动态卡片类名
const cardClasses = computed(() => {
  if (isPushEvent.value) return 'push-card';
  if (isDownloadEvent.value) return 'download-card';
  if (isMergeRequestEvent.value) return 'merge-request-card';
  return 'default-card';
});

// 处理卡片点击
const handleCardClick = () => {
  const url = props.activity._links?.action_type;
  if (url) {
    window.open(url, '_blank');
  }
};
</script>

<style scoped>
.activity-card {
  transition: all 0.25s ease;
}

.activity-card.clickable {
  cursor: pointer;
}

.activity-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* el-card__body 布局 */
.activity-card :deep(.el-card__body) {
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

/* MergeRequest 事件样式 */
.merge-request-card :deep(.el-card__body) {
  background: linear-gradient(135deg, #e8f5e9 0%, #f5f5f5 100%);
  border-left: 4px solid #4caf50;
}

.mr-action {
  font-weight: 500;
  font-size: 14px;
  color: #2e7d32;
  margin-bottom: 8px;
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

.mr-title {
  font-size: 16px;
  font-weight: 600;
  color: #2e7d32;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mr-details {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.15);
}

.branch-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2e7d32;
  font-weight: 500;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  margin-right: auto;
}

.source-branch,
.target-branch {
  background: rgba(76, 175, 80, 0.15);
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 600;
}

.arrow-icon {
  color: #4caf50;
  font-size: 14px;
  flex-shrink: 0;
}

.mr-number {
  font-weight: 700;
  font-size: 14px;
  color: #1b5e20;
  background: rgba(76, 175, 80, 0.25);
  padding: 4px 10px;
  border-radius: 4px;
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

.activity-title {
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
