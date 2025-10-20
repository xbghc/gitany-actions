<template>
  <div class="dashboard">
    <el-card class="header-card">
      <h2>GitCode 仓库管理</h2>
      <p>选择仓库以开始管理 PR 和 Issue</p>

      <div class="repo-selector">
        <el-form :inline="true">
          <el-form-item label="所有者">
            <el-input v-model="owner" placeholder="输入所有者" />
          </el-form-item>
          <el-form-item label="仓库">
            <el-input v-model="repo" placeholder="输入仓库名" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSetRepo">设置仓库</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="currentOwner && currentRepo" class="current-repo">
        <el-tag type="success" size="large">
          当前仓库: {{ currentOwner }}/{{ currentRepo }}
        </el-tag>
      </div>
    </el-card>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card">
          <el-statistic title="开放的 PR" :value="0" />
          <template #footer>
            <router-link to="/pr?state=open">查看详情</router-link>
          </template>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <el-statistic title="开放的 Issue" :value="0" />
          <template #footer>
            <router-link to="/issue?state=open">查看详情</router-link>
          </template>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <el-statistic title="已合并的 PR" :value="0" />
          <template #footer>
            <router-link to="/pr?state=merged">查看详情</router-link>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRepoStore } from '@/store';
import { ElMessage } from 'element-plus';

const repoStore = useRepoStore();
const { currentOwner, currentRepo } = storeToRefs(repoStore);
const { setCurrentRepo, restoreFromStorage } = repoStore;

const owner = ref('');
const repo = ref('');

onMounted(() => {
  restoreFromStorage();
  if (currentOwner.value && currentRepo.value) {
    owner.value = currentOwner.value;
    repo.value = currentRepo.value;
  }
});

const handleSetRepo = () => {
  if (!owner.value || !repo.value) {
    ElMessage.warning('请输入所有者和仓库名');
    return;
  }
  setCurrentRepo(owner.value, repo.value);
  ElMessage.success('仓库设置成功');
};
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.header-card {
  margin-bottom: 24px;
}

.header-card h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.header-card p {
  margin: 0 0 24px 0;
  color: #909399;
}

.repo-selector {
  margin-bottom: 24px;
}

.current-repo {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.stat-card :deep(.el-card__footer) {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
}

.stat-card a {
  color: #409eff;
  text-decoration: none;
}

.stat-card a:hover {
  text-decoration: underline;
}
</style>
