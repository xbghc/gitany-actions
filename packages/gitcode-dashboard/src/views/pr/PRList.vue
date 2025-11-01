<template>
  <div class="pr-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>Pull Request 列表</h3>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filters">
        <el-form :inline="true">
          <el-form-item label="状态">
            <el-select v-model="filters.state" placeholder="选择状态" style="width: 120px" @change="handleFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="Open" value="open" />
              <el-option label="Closed" value="closed" />
              <el-option label="Merged" value="merged" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="RefreshRight" @click="handleRefresh">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- PR 列表 -->
      <el-table
        v-loading="loading"
        :data="prList"
        style="width: 100%"
      >
        <el-table-column prop="number" label="编号" width="80" />
        <el-table-column label="标题" min-width="300">
          <template #default="{ row }">
            <div class="pr-title">
              <span>{{ row.title }}</span>
              <div class="pr-labels">
                <el-tag
                  v-for="label in row.labels"
                  :key="label.id"
                  size="small"
                  :color="'#' + label.color"
                >
                  {{ label.name }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag :status="row.state" />
          </template>
        </el-table-column>
        <el-table-column label="作者" width="150">
          <template #default="{ row }">
            <UserAvatar :user="row.user" :show-name="true" />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              :icon="Promotion"
              size="small"
              @click="handleRunTest(row)"
            >
              运行测试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <EmptyState v-if="!loading && prList.length === 0" description="暂无 PR" />

      <!-- Workflow 测试对话框 -->
      <WorkflowDialog
        v-model="workflowDialogVisible"
        :pr-number="selectedPR?.number || 0"
        :owner="selectedPR?.owner || ''"
        :repo="selectedPR?.repo || ''"
        @success="handleWorkflowSuccess"
      />

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.per_page"
          :total="totalCount"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleFilterChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { RefreshRight, Promotion } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { usePRStore, useRepoStore } from '@/store';
import StatusTag from '@/components/StatusTag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import EmptyState from '@/components/EmptyState.vue';
import WorkflowDialog from '@/components/WorkflowDialog.vue';
import type { PullRequest } from '@/types';

const prStore = usePRStore();
const repoStore = useRepoStore();

// 使用 storeToRefs 解构响应式状态
const { prList, loading, filters, prCount } = storeToRefs(prStore);
const { selectedRepoId } = storeToRefs(repoStore);
// 方法可以直接解构
const { fetchPRList, clearCache } = prStore;

// Workflow 对话框
const workflowDialogVisible = ref(false);
const selectedPR = ref<PullRequest & { owner?: string; repo?: string }>();

// 计算当前筛选状态下的 PR 总数
const totalCount = computed(() => {
  if (!prCount.value) return 0;

  switch (filters.value.state) {
    case 'open':
      return prCount.value.opened || 0;
    case 'closed':
      return prCount.value.closed || 0;
    case 'merged':
      return prCount.value.merged || 0;
    case 'all':
    default:
      return prCount.value.all || 0;
  }
});

// 由于 store 中已经监听了 selectedRepoId 的变化，会自动加载数据
// 这里只需要提供手动刷新的功能

/**
 * 换页处理
 */
const handlePageChange = () => {
  // fetchPRList 会自动从缓存读取并显示，无需额外处理
  // store 中的 watch 会自动触发 displayFromCache
};

/**
 * 筛选变化
 */
const handleFilterChange = () => {
  filters.value.page = 1;
  // store 中的 watch 会自动触发 displayFromCache
};

/**
 * 刷新按钮：清空缓存并重新获取
 */
const handleRefresh = async () => {
  await clearCache();
  await fetchPRList();
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};

/**
 * 运行测试
 */
const handleRunTest = (pr: PullRequest) => {
  if (!selectedRepoId.value) {
    ElMessage.warning('请先选择仓库');
    return;
  }

  // 从 selectedRepoId 解析 owner 和 repo
  const [owner, repo] = selectedRepoId.value.split('/');

  selectedPR.value = {
    ...pr,
    owner,
    repo,
  };

  workflowDialogVisible.value = true;
};

/**
 * 测试成功回调
 */
const handleWorkflowSuccess = () => {
  ElMessage.success('测试通过！');
};
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}

.filters {
  margin-bottom: 16px;
}

.pr-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pr-labels {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
</style>
