<template>
  <div class="workflow-container">
    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="workflow-tabs">
      <el-tab-pane label="执行记录" name="executions">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <!-- 状态筛选 -->
            <el-radio-group v-model="workflowLogStore.statusFilter" size="small">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="success">成功</el-radio-button>
              <el-radio-button value="failed">失败</el-radio-button>
              <el-radio-button value="running">运行中</el-radio-button>
              <el-radio-button value="pending">等待中</el-radio-button>
            </el-radio-group>
          </div>

          <div class="toolbar-right">
            <el-button :icon="Refresh" @click="handleRefreshWorkflows">刷新</el-button>
          </div>
        </div>

        <!-- 执行记录表格 -->
        <el-table
          v-loading="workflowLogStore.loading"
          :data="workflowLogStore.pagedLogList"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="workflowId" label="Workflow ID" width="180">
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewLogs(row.workflowId)">
                {{ row.workflowId.substring(0, 12) }}...
              </el-link>
            </template>
          </el-table-column>

          <el-table-column prop="prNumber" label="PR编号" width="100">
            <template #default="{ row }">
              <el-link type="primary">#{{ row.prNumber }}</el-link>
            </template>
          </el-table-column>

          <el-table-column prop="configName" label="使用配置" width="150">
            <template #default="{ row }">
              {{ row.configName || '-' }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatRelativeTime(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column prop="completedAt" label="完成时间" width="180">
            <template #default="{ row }">
              {{ row.completedAt ? formatRelativeTime(row.completedAt) : '-' }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleViewLogs(row.workflowId)">
                查看日志
              </el-button>
              <el-popconfirm
                title="确定要删除这条日志吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleDeleteLog(row.workflowId)"
              >
                <template #reference>
                  <el-button type="danger" size="small" :icon="Delete">删除</el-button>
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

      <el-tab-pane label="配置管理" name="configs">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="config-count">共 {{ configStore.totalCount }} 个配置</span>
          </div>

          <div class="toolbar-right">
            <el-button type="primary" :icon="Plus" @click="handleCreateConfig">
              新建配置
            </el-button>
            <el-button :icon="Refresh" @click="handleRefreshConfigs">刷新</el-button>
          </div>
        </div>

        <!-- 配置管理表格 -->
        <el-table
          v-loading="configStore.loading"
          :data="configStore.configList"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="name" label="配置名称" width="200" />

          <el-table-column prop="steps" label="步骤概览" width="300">
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

          <el-table-column prop="env" label="环境变量" width="120">
            <template #default="{ row }">
              {{ row.env ? Object.keys(row.env).length : 0 }} 个
            </template>
          </el-table-column>

          <el-table-column prop="timeout" label="超时时间" width="120">
            <template #default="{ row }">
              {{ row.timeout ? `${row.timeout / 1000}s` : '无限制' }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEditConfig(row.id)">
                编辑
              </el-button>
              <el-popconfirm title="确定要删除这个配置吗？" @confirm="handleDeleteConfig(row.id)">
                <template #reference>
                  <el-button type="danger" size="small">删除</el-button>
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
import { useWorkflowConfigStore } from '@/store';
import { useWorkflowLogStore, type WorkflowStatus, type WorkflowConfig } from '@/store/workflow';
import WorkflowLogViewer from '@/components/WorkflowLogViewer.vue';
import WorkflowConfigDialog from '@/components/WorkflowConfigDialog.vue';
import { formatRelativeTime } from '@/utils/timeFormatter';

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
 * 获取状态标签类型
 */
const getStatusTagType = (status: WorkflowStatus) => {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
      return 'warning';
    default:
      return 'info';
  }
};

/**
 * 获取状态文本
 */
const getStatusText = (status: WorkflowStatus) => {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'running':
      return '运行中';
    case 'success':
      return '成功';
    case 'failed':
      return '失败';
  }
};

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
    ElMessage.error('配置不存在');
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
