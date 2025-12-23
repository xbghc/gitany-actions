<template>
  <div class="comment-list">
    <div v-for="comment in comments" :key="comment.id" class="comment-item">
      <div class="comment-header">
        <UserAvatar :user="comment.user" :show-name="true" />
        <span class="comment-time">{{ formatDateTime(comment.created_at) }}</span>
      </div>
      <div class="comment-body">
        <MarkdownViewer :content="comment.body" />
      </div>
    </div>
    <EmptyState v-if="comments.length === 0" description="暂无评论" />
  </div>
</template>

<script setup lang="ts">
import type { PRComment } from '@/store/pr';
import type { IssueComment } from '@/store/issue';
import UserAvatar from './UserAvatar.vue';
import MarkdownViewer from './MarkdownViewer.vue';
import EmptyState from './EmptyState.vue';
import { formatDateTime } from '@/utils/time';

interface Props {
  comments: PRComment[] | IssueComment[];
}

defineProps<Props>();
</script>

<style scoped>
.comment-list {
  margin-top: 24px;
}

.comment-item {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.comment-time {
  font-size: 14px;
  color: #909399;
}

.comment-body {
  padding-left: 40px;
}
</style>
