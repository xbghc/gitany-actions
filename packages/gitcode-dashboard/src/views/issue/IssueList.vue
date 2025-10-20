<template>
  <div class="issue-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>Issue 列表</h3>
          <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
            创建 Issue
          </el-button>
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
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="RefreshRight" @click="fetchData">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- Issue 列表 -->
      <el-table
        v-loading="loading"
        :data="issueList"
        style="width: 100%"
      >
        <el-table-column prop="number" label="编号" width="80" />
        <el-table-column label="标题" min-width="300">
          <template #default="{ row }">
            <div class="issue-title">
              <span>{{ row.title }}</span>
              <div class="issue-labels">
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
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <EmptyState v-if="!loading && issueList.length === 0" description="暂无 Issue" />

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.per_page"
          :total="100"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleFilterChange"
          @current-change="handleFilterChange"
        />
      </div>
    </el-card>

    <!-- 创建 Issue 对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建 Issue" width="600px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="createForm.title" placeholder="输入 Issue 标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.body"
            type="textarea"
            :rows="6"
            placeholder="输入 Issue 描述（支持 Markdown）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creating"
          :disabled="!createForm.title.trim()"
          @click="handleCreateIssue"
        >
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { Plus, RefreshRight } from '@element-plus/icons-vue';
import { useIssueStore, useRepoStore } from '@/store';
import { createIssue } from '@/api';
import StatusTag from '@/components/StatusTag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import EmptyState from '@/components/EmptyState.vue';
import { ElMessage } from 'element-plus';

const issueStore = useIssueStore();
const repoStore = useRepoStore();

// 使用 storeToRefs 解构响应式状态
const { issueList, loading, filters } = storeToRefs(issueStore);
// 方法可以直接解构
const { fetchIssueList } = issueStore;

// 由于 store 中已经监听了 selectedRepoId 的变化，会自动加载数据
// 这里只需要提供手动刷新的功能

const showCreateDialog = ref(false);
const creating = ref(false);
const createForm = reactive({
  title: '',
  body: '',
});

// 计算当前仓库信息（用于创建 Issue）
const currentOwner = computed(() => repoStore.currentOwner);
const currentRepo = computed(() => repoStore.currentRepo);

const fetchData = () => {
  fetchIssueList();
};

const handleFilterChange = () => {
  fetchData();
};

const handleCreateIssue = async () => {
  if (!createForm.title.trim()) return;

  if (!currentOwner.value || !currentRepo.value) {
    ElMessage.warning('请先选择仓库');
    return;
  }

  creating.value = true;
  try {
    await createIssue(currentOwner.value, currentRepo.value, createForm);
    ElMessage.success('Issue 创建成功');
    showCreateDialog.value = false;
    createForm.title = '';
    createForm.body = '';
    fetchData();
  } catch (error) {
    ElMessage.error('创建 Issue 失败');
  } finally {
    creating.value = false;
  }
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
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

.issue-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-labels {
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
