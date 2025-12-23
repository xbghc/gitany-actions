<template>
  <div class="pr-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>{{ t('pr.list_title') }}</h3>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filters">
        <el-form :inline="true">
          <el-form-item :label="t('pr.table.status')">
            <el-select
              v-model="filters.state"
              :placeholder="t('status.select')"
              style="width: 120px"
              @change="handleFilterChange"
            >
              <el-option :label="t('status.all')" value="all" />
              <el-option :label="t('status.open')" value="open" />
              <el-option :label="t('status.closed')" value="closed" />
              <el-option :label="t('status.merged')" value="merged" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="RefreshRight" @click="handleRefresh">{{
              t('common.refresh')
            }}</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- PR 列表 -->
      <el-table v-loading="loading" :data="prList" style="width: 100%">
        <el-table-column prop="number" :label="t('pr.table.number')" width="80" />
        <el-table-column :label="t('pr.table.title')" min-width="300">
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
        <el-table-column :label="t('pr.table.status')" width="100">
          <template #default="{ row }">
            <StatusTag :status="row.state" />
          </template>
        </el-table-column>
        <el-table-column :label="t('pr.table.author')" width="150">
          <template #default="{ row }">
            <UserAvatar :user="row.user" :show-name="true" />
          </template>
        </el-table-column>
        <el-table-column :label="t('pr.table.updated_at')" width="180">
          <template #default="{ row }">
            {{ formatRelativeTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('pr.table.actions')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button :icon="Promotion" size="small" @click="handleRunTest(row)">
              {{ t('pr.run_test') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <EmptyState v-if="!loading && prList.length === 0" :description="t('pr.no_pr')" />

      <!-- 配置选择对话框 -->
      <WorkflowConfigSelector
        v-model:visible="configSelectorVisible"
        :owner="selectedPR?.owner || ''"
        :repo="selectedPR?.repo || ''"
        @select="handleConfigSelected"
      />

      <!-- Workflow 日志查看器 -->
      <WorkflowLogViewer v-model:visible="logViewerVisible" :workflow-id="currentWorkflowId" />

      <!-- 分页 -->
      <div class="pagination" @mouseover="handlePaginationMouseOver">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.per_page"
          :total="totalCount"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleFilterChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { RefreshRight, Promotion } from '@element-plus/icons-vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { usePRStore, useRepoStore } from '@/store';
import { triggerPRWorkflow } from '@/api';
import StatusTag from '@/components/StatusTag.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatRelativeTime } from '@/utils/time';
import WorkflowConfigSelector from '@/components/WorkflowConfigSelector.vue';
import WorkflowLogViewer from '@/components/WorkflowLogViewer.vue';
import type { PullRequest } from '@/store/pr';
import type { WorkflowConfig } from '@/store/workflow';

const { t } = useI18n();
const prStore = usePRStore();
const repoStore = useRepoStore();

// 使用 storeToRefs 解构响应式状态
const { prList, loading, filters, prCount } = storeToRefs(prStore);
const { selectedRepoId } = storeToRefs(repoStore);
// 方法可以直接解构
const { fetchPRList } = prStore;

// 配置选择对话框
const configSelectorVisible = ref(false);
const selectedPR = ref<PullRequest & { owner?: string; repo?: string }>();

// Workflow 日志查看器
const logViewerVisible = ref(false);
const currentWorkflowId = ref('');

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

/**
 * 筛选变化
 */
const handleFilterChange = () => {
  filters.value.page = 1;
};

/**
 * 刷新按钮：重新获取数据
 */
const handleRefresh = async () => {
  await fetchPRList();
};

const handlePaginationMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const nextBtn = target.closest('.btn-next');

  if (
    nextBtn &&
    !nextBtn.hasAttribute('disabled') &&
    nextBtn.getAttribute('aria-disabled') !== 'true'
  ) {
    const perPage = filters.value.per_page || 20;
    const maxPage = Math.ceil(totalCount.value / perPage);
    const nextPage = (filters.value.page || 1) + 1;

    if (nextPage <= maxPage) {
      prStore.queryPRList(nextPage);
    }
  }
};

/**
 * 运行测试 - 打开配置选择对话框
 */
const handleRunTest = (pr: PullRequest) => {
  if (!selectedRepoId.value) {
    ElMessage.warning(t('pr.select_repo_first'));
    return;
  }

  // 从 selectedRepoId 解析 owner 和 repo
  const [owner, repo] = selectedRepoId.value.split('/');

  selectedPR.value = {
    ...pr,
    owner,
    repo,
  };

  configSelectorVisible.value = true;
};

/**
 * 配置选择完成 - 触发 workflow
 */
const handleConfigSelected = async (configId: string, config: WorkflowConfig) => {
  if (!selectedPR.value) return;

  const { owner, repo, number } = selectedPR.value;

  if (!owner || !repo) {
    ElMessage.error(t('pr.cannot_get_repo_info'));
    return;
  }

  try {
    // 触发 workflow
    const response = await triggerPRWorkflow(number, {
      owner,
      repo,
      configId,
    });

    if (response.data) {
      currentWorkflowId.value = response.data.workflowId;

      // 显示通知
      ElNotification.success({
        title: t('pr.test_started', { number }),
        message: t('pr.using_config', { name: config.name }),
        duration: 3000,
      });

      // 自动打开日志查看器
      logViewerVisible.value = true;
    }
  } catch (error) {
    console.error('触发 workflow 失败:', error);
    ElMessage.error(t('pr.start_test_failed'));
  }
};
</script>

<style scoped>
.pr-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pr-list :deep(.el-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pr-list :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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

.last-update-time {
  color: #909399;
  font-size: 14px;
}
</style>
