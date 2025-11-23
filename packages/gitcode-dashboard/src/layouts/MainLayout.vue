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

        <!-- 选中仓库后显示主内容插槽 -->
        <slot v-else name="main">
          <!-- 默认内容：仓库管理 -->
          <RepoContent />
        </slot>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { FolderOpened } from '@element-plus/icons-vue';
import Header from '@/components/Header.vue';
import RepoList from '@/components/RepoList.vue';
import RepoContent from '@/components/RepoContent.vue';
import { useRepoStore, useAuthStore } from '@/store';

const repoStore = useRepoStore();
const authStore = useAuthStore();

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
