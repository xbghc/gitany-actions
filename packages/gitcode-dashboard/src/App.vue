<template>
  <el-config-provider :locale="zhCn">
    <div id="app" class="app-container">
      <!-- 顶部 Token 配置栏 -->
      <TokenBar />

      <el-container class="main-container">
        <!-- 左侧仓库列表 -->
        <el-aside width="240px" class="app-aside">
          <RepoList />
        </el-aside>

        <!-- 主内容区域 -->
        <el-main class="app-main">
          <!-- 路由视图（用于详情页） -->
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" v-if="Component" />
            </transition>
          </router-view>

          <!-- 未在详情页时显示主内容 -->
          <div v-if="!isDetailPage">
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
                <el-tab-pane label="Issue" name="issue">
                  <IssueList />
                </el-tab-pane>
                <el-tab-pane label="Pull Request" name="pr">
                  <PRList />
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </el-main>
      </el-container>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import { Folder, FolderOpened } from '@element-plus/icons-vue';
import TokenBar from '@/components/TokenBar.vue';
import RepoList from '@/components/RepoList.vue';
import IssueList from '@/views/issue/IssueList.vue';
import PRList from '@/views/pr/PRList.vue';
import { useRepoStore, useAuthStore } from '@/store';

const route = useRoute();
const repoStore = useRepoStore();
const authStore = useAuthStore();

const activeTab = ref<'issue' | 'pr'>('issue');

// 判断是否在详情页
const isDetailPage = computed(() => {
  return route.name === 'PRDetail' || route.name === 'IssueDetail';
});

onMounted(() => {
  // 加载初始数据
  authStore.loadToken();
  repoStore.loadRepos();
});
</script>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  margin-top: 50px; /* Token Bar 的高度 */
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
  overflow-y: auto;
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
  overflow-y: auto;
  padding: 24px;
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

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html,
body {
  height: 100%;
  overflow: hidden;
}
</style>
