<template>
  <div class="main-layout">
    <!-- 顶部 Header -->
    <Header />

    <el-container class="main-container">
      <!-- 左侧仓库列表 -->
      <el-aside width="240px" class="app-aside">
        <RepoList />
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="app-main">
        <!-- 未选中仓库时的提示 -->
        <div v-if="!repoStore.selectedRepo" class="welcome-state">
          <el-empty description="请先在左侧添加并选择一个仓库" :image-size="200">
            <template #image>
              <el-icon :size="80" color="#909399"><FolderOpened /></el-icon>
            </template>
          </el-empty>
        </div>

        <!-- 选中仓库后显示内容 -->
        <div v-else class="repo-content">
          <!-- 仓库信息头部 -->
          <div class="repo-header">
            <div class="repo-title">
              <el-icon :size="24" color="#1890ff"><Folder /></el-icon>
              <h2>{{ repoStore.selectedRepo.owner }} / {{ repoStore.selectedRepo.repo }}</h2>
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
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Folder, FolderOpened, Bell } from '@element-plus/icons-vue';
import Header from '@/components/Header.vue';
import RepoList from '@/components/RepoList.vue';
import ActivityList from '@/views/activity/ActivityList.vue';
import IssueList from '@/views/issue/IssueList.vue';
import PRList from '@/views/pr/PRList.vue';
import WorkflowList from '@/views/workflow/WorkflowList.vue';
import { useRepoStore, useAuthStore } from '@/store';

const repoStore = useRepoStore();
const authStore = useAuthStore();

const activeTab = ref<'activity' | 'issue' | 'pr' | 'workflow'>('activity');

onMounted(() => {
  // 加载初始数据
  authStore.loadToken();
  repoStore.loadRepos();
});
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  margin-top: 50px; /* Header 的高度 */
  overflow: hidden;
}

.app-aside {
  background-color: #001529;
  color: #fff;
  height: 100%;
}

.app-main {
  background-color: #f5f5f5;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

.welcome-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 48px;
}

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
