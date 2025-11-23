<template>
  <div class="repo-content">
    <!-- 仓库信息头部 -->
    <div class="repo-header">
      <div class="repo-title">
        <el-icon :size="24" color="#1890ff"><Folder /></el-icon>
        <h2>{{ repoStore.selectedRepo?.owner }} / {{ repoStore.selectedRepo?.repo }}</h2>
      </div>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="content-tabs">
      <el-tab-pane name="activity">
        <template #label>
          <span
            ><el-icon><Bell /></el-icon> 动态</span
          >
        </template>
        <ActivityList />
      </el-tab-pane>
      <el-tab-pane label="Issue" name="issue">
        <IssueList />
      </el-tab-pane>
      <el-tab-pane label="Pull Request" name="pr">
        <PRList />
      </el-tab-pane>
      <el-tab-pane label="Workflow" name="workflow">
        <WorkflowList />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Folder, Bell } from '@element-plus/icons-vue';
import ActivityList from '@/views/activity/ActivityList.vue';
import IssueList from '@/views/issue/IssueList.vue';
import PRList from '@/views/pr/PRList.vue';
import WorkflowList from '@/views/workflow/WorkflowList.vue';
import { useRepoStore } from '@/store';

const repoStore = useRepoStore();
const activeTab = ref<'activity' | 'issue' | 'pr' | 'workflow'>('activity');
</script>

<style scoped>
.repo-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.repo-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
}

.repo-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.repo-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 24px;
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.content-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: hidden;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.content-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
