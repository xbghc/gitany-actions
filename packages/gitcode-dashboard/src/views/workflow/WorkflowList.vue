<template>
  <div class="workflow-container">
    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="workflow-tabs">
      <el-tab-pane :label="t('workflow.executions_tab')" name="executions">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <!-- 状态筛选 -->
            <el-radio-group v-model="workflowLogStore.statusFilter" size="small">
              <el-radio-button value="all">{{ t('status.all') }}</el-radio-button>
              <el-radio-button value="success">{{ t('status.success') }}</el-radio-button>
              <el-radio-button value="failed">{{ t('status.failed') }}</el-radio-button>
              <el-radio-button value="running">{{ t('status.running') }}</el-radio-button>
              <el-radio-button value="pending">{{ t('status.pending') }}</el-radio-button>
            </el-radio-group>
          </div>

          <div class="toolbar-right">
            <el-button :icon="Refresh" @click="handleRefreshWorkflows">{{
              t('common.refresh')
            }}</el-button>
          </div>
        </div>

        <!-- 执行记录表格 -->
        <el-table
          v-loading="workflowLogStore.loading"
          :data="workflowLogStore.pagedLogList"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="workflowId" :label="t('workflow.table.workflow_id')" width="180">
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewLogs(row.workflowId)">
                {{ row.workflowId.substring(0, 12) }}...
              </el-link>
            </template>
          </el-table-column>

          <el-table-column prop="prNumber" :label="t('workflow.table.pr_number')" width="100">
            <template #default="{ row }">
              <el-link type="primary">#{{ row.prNumber }}</el-link>
            </template>
          </el-table-column>

          <el-table-column prop="configName" :label="t('workflow.table.config_name')" width="150">
            <template #default="{ row }">
              {{ row.configName || '-' }}
            </template>
          </el-table-column>

          <el-table-column prop="status" :label="t('workflow.table.status')" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" :label="t('workflow.table.created_at')" width="180">
            <template #default="{ row }">
              {{ formatRelativeTime(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column prop="completedAt" :label="t('workflow.table.completed_at')" width="180">
            <template #default="{ row }">
              {{ row.completedAt ? formatRelativeTime(row.completedAt) : '-' }}
            </template>
          </el-table-column>

          <el-table-column :label="t('workflow.table.actions')" width="250" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleViewLogs(row.workflowId)">
                {{ t('workflow.view_logs') }}
              </el-button>
              <el-popconfirm
                :title="t('workflow.confirm_delete_log')"
                :confirm-button-text="t('common.confirm')"
                :cancel-button-text="t('common.cancel')"
                @confirm="handleDeleteLog(row.workflowId)"
              >
                <template #reference>
                  <el-button type="danger" size="small" :icon="Delete">{{
                    t('common.delete')
                  }}</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="workflowLogStore.currentPage"
            :page-size="workflowLogStore.pageSize"
            :total="workflowLogStore.filteredCount"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('workflow.configs_tab')" name="configs">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="config-count">{{
              t('workflow.config_count', { count: configStore.totalCount })
            }}</span>
          </div>

          <div class="toolbar-right">
            <el-button type="primary" :icon="Plus" @click="handleCreateConfig">
              {{ t('workflow.new_config') }}
            </el-button>
            <el-button :icon="Refresh" @click="handleRefreshConfigs">{{
              t('common.refresh')
            }}</el-button>
          </div>
        </div>

        <!-- 配置管理表格 -->
        <el-table
          v-loading="configStore.loading"
          :data="configStore.configList"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="name" :label="t('workflow.table.config_name_col')" width="200" />

          <el-table-column prop="steps" :label="t('workflow.table.steps_overview')" width="300">
            <template #default="{ row }">
              <el-tag
                v-for="(step, index) in row.steps"
                :key="index"
                size="small"
                style="margin-right: 4px"
              >
                {{ step.name }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="env" :label="t('workflow.table.env_vars')" width="120">
            <template #default="{ row }">
              {{
                t('workflow.table.env_var_count', {
                  count: row.env ? Object.keys(row.env).length : 0,
                })
              }}
            </template>
          </el-table-column>

          <el-table-column prop="timeout" :label="t('workflow.table.timeout')" width="120">
            <template #default="{ row }">
              {{ row.timeout ? `${row.timeout / 1000}s` : t('workflow.table.no_limit') }}
            </template>
          </el-table-column>

          <el-table-column :label="t('workflow.table.actions')" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEditConfig(row.id)">
                {{ t('common.edit') }}
              </el-button>
              <el-popconfirm
                :title="t('workflow.confirm_delete_config')"
                @confirm="handleDeleteConfig(row.id)"
              >
                <template #reference>
                  <el-button type="danger" size="small">{{ t('common.delete') }}</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- WorkflowLogViewer 对话框 -->
    <WorkflowLogViewer v-model:visible="logViewerVisible" :workflow-id="selectedWorkflowId" />

    <!-- WorkflowConfigDialog 对话框 -->
    <WorkflowConfigDialog
      v-model:visible="configDialogVisible"
      :config="selectedConfig"
      @success="handleConfigSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Refresh, Plus, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useWorkflowConfigStore } from '@/store';
import { useWorkflowLogStore, type WorkflowConfig } from '@/store/workflow';
import { useStatusText, getStatusTagType } from '@/utils/status';
import WorkflowLogViewer from '@/components/WorkflowLogViewer.vue';
import WorkflowConfigDialog from '@/components/WorkflowConfigDialog.vue';
import { formatRelativeTime } from '@/utils/time';

const { t } = useI18n();
const { getStatusText } = useStatusText();

const workflowLogStore = useWorkflowLogStore();
const configStore = useWorkflowConfigStore();

// Tab 状态
const activeTab = ref<'executions' | 'configs'>('executions');

// LogViewer 对话框
const logViewerVisible = ref(false);
const selectedWorkflowId = ref('');

// ConfigDialog 对话框
const configDialogVisible = ref(false);
const selectedConfig = ref<WorkflowConfig | undefined>(undefined);

/**
 * 刷新 Workflow 列表
 */
const handleRefreshWorkflows = () => {
  workflowLogStore.refreshLogList();
};

/**
 * 刷新配置列表
 */
const handleRefreshConfigs = () => {
  configStore.fetchConfigList();
};

/**
 * 分页变化
 */
const handlePageChange = (page: number) => {
  workflowLogStore.updatePage(page);
};

/**
 * 删除日志
 */
const handleDeleteLog = async (workflowId: string) => {
  await workflowLogStore.deleteLog(workflowId);
};

/**
 * 查看日志
 */
const handleViewLogs = (workflowId: string) => {
  selectedWorkflowId.value = workflowId;
  logViewerVisible.value = true;
};

/**
 * 创建配置
 */
const handleCreateConfig = () => {
  selectedConfig.value = undefined;
  configDialogVisible.value = true;
};

/**
 * 编辑配置
 */
const handleEditConfig = (id: string) => {
  const config = configStore.configList.find((c) => c.id === id);
  if (!config) {
    ElMessage.error(t('workflow.config_not_exists'));
    return;
  }
  selectedConfig.value = config;
  configDialogVisible.value = true;
};

/**
 * 删除配置
 */
const handleDeleteConfig = async (id: string) => {
  await configStore.deleteConfig(id);
};

/**
 * 配置保存成功
 */
const handleConfigSuccess = () => {
  configStore.fetchConfigList();
};
</script>

<style scoped>
.workflow-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 0;
}

.workflow-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workflow-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-count {
  font-size: 14px;
  color: #606266;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
