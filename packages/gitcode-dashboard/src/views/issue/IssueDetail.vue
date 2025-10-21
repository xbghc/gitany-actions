<template>
  <div class="issue-detail-view">
    <el-page-header @back="goBack" class="page-header">
      <template #content>
        <div v-if="issue && !loading" class="header-content">
          <span class="header-title">Issue #{{ issue.number }}: {{ issue.title }}</span>
          <StatusTag :status="issue.state" />
        </div>
        <div v-else class="header-content">
          <span class="header-title">加载中...</span>
        </div>
      </template>
    </el-page-header>

    <el-card class="content-card" v-loading="loading && !issue">
      <template #header>
        <h3>Issue 详情</h3>
      </template>
      <div v-if="issue">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="作者">
            <UserAvatar :user="issue.user" :show-name="true" />
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(issue.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="标签">
             <el-tag
                v-for="label in issue.labels"
                :key="label.id"
                size="small"
                :color="'#' + label.color"
              >
                {{ label.name }}
              </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <div class="issue-body">
          <h4>描述</h4>
          <p>{{ issue.body || '没有提供描述。' }}</p>
        </div>
      </div>
      <EmptyState v-else-if="!loading" description="无法加载 Issue 详情" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useIssueStore } from '@/store';
import StatusTag from '@/components/StatusTag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import EmptyState from '@/components/EmptyState.vue';

const route = useRoute();
const router = useRouter();
const issueStore = useIssueStore();

const issueNumber = Number(route.params.issueNumber);

// 从 store 中获取数据和加载状态
// 使用 storeToRefs 来保持响应性
const { issueDetail: issue, loading } = storeToRefs(issueStore);

onMounted(() => {
  // SWR 逻辑:
  // 无论 store 中是否有数据 (stale), 都去 fetch 最新的
  issueStore.fetchIssueDetail(issueNumber);

  // 组件加载时，如果 store 中没有这个 issue 的数据，
  // issue.value 会是 undefined (或者上一个 issue 的数据),
  // 此时页面会显示 loading。
  // 如果是预加载的，issue.value 会有 "stale" 数据，
  // 页面会立即渲染旧数据，同时后台更新。
});

const goBack = () => {
  router.back();
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};
</script>

<style scoped>
.issue-detail-view {
  padding: 24px;
}
.page-header {
  margin-bottom: 24px;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-title {
  font-size: 20px;
}
.content-card {
  min-height: 400px;
}
.issue-body {
  margin-top: 24px;
}
.issue-body h4 {
  margin-bottom: 16px;
}
.issue-body p {
  line-height: 1.6;
}
</style>
