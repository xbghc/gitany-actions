<template>
  <el-dialog
    :model-value="visible"
    title="选择测试配置"
    width="700px"
    @update:model-value="handleClose"
    @close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="32">
        <Loading />
      </el-icon>
      <p>加载配置列表...</p>
    </div>

    <div v-else-if="configList.length === 0" class="empty-container">
      <el-empty description="暂无可用配置">
        <el-button type="primary" @click="handleGoToConfigManagement">前往创建配置</el-button>
      </el-empty>
    </div>

    <div v-else class="config-list">
      <el-radio-group v-model="selectedConfigId" class="config-radio-group">
        <el-radio
          v-for="config in configList"
          :key="config.configId"
          :value="config.configId"
          class="config-radio-item"
          border
        >
          <div class="config-item-content">
            <div class="config-header">
              <span class="config-name">{{ config.name }}</span>
              <el-tag v-if="config.timeout" size="small" type="info">
                超时: {{ config.timeout / 1000 }}s
              </el-tag>
            </div>

            <div class="config-steps">
              <el-tag
                v-for="(step, index) in config.steps"
                :key="index"
                size="small"
                effect="plain"
                style="margin-right: 4px; margin-bottom: 4px"
              >
                {{ step.name }}
              </el-tag>
            </div>

            <div v-if="config.env && Object.keys(config.env).length > 0" class="config-env">
              <span class="env-label">环境变量:</span>
              <el-tag
                v-for="key in Object.keys(config.env)"
                :key="key"
                size="small"
                type="success"
                effect="plain"
                style="margin-right: 4px"
              >
                {{ key }}
              </el-tag>
            </div>
          </div>
        </el-radio>
      </el-radio-group>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :disabled="!selectedConfigId"
        @click="handleConfirm"
      >
        开始测试
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useWorkflowConfigStore } from '@/store';
import type { WorkflowConfig } from '@/types';

interface Props {
  visible: boolean;
  owner: string;
  repo: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'select', configId: string, config: WorkflowConfig): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const configStore = useWorkflowConfigStore();
const selectedConfigId = ref<string>('');
const loading = ref(false);

// 配置列表（从 store 获取）
const configList = ref<WorkflowConfig[]>([]);

/**
 * 加载配置列表
 */
const loadConfigs = async () => {
  if (!props.owner || !props.repo) return;

  loading.value = true;
  try {
    await configStore.fetchConfigList();
    configList.value = configStore.configList;

    // 如果只有一个配置，自动选中
    if (configList.value.length === 1) {
      selectedConfigId.value = configList.value[0].configId;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('加载配置列表失败:', error);
    }
    ElMessage.error('加载配置列表失败');
  } finally {
    loading.value = false;
  }
};

/**
 * 确认选择
 */
const handleConfirm = () => {
  if (!selectedConfigId.value) {
    ElMessage.warning('请选择一个配置');
    return;
  }

  const selectedConfig = configList.value.find(
    (config) => config.configId === selectedConfigId.value,
  );

  if (!selectedConfig) {
    ElMessage.error('配置不存在');
    return;
  }

  emit('select', selectedConfigId.value, selectedConfig);
  handleClose();
};

/**
 * 关闭对话框
 */
const handleClose = () => {
  selectedConfigId.value = '';
  emit('update:visible', false);
};

/**
 * 前往配置管理
 */
const handleGoToConfigManagement = () => {
  ElMessage.info('请先在"Workflow 管理"页面创建配置');
  handleClose();
};

// 监听对话框打开，加载配置列表
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadConfigs();
    }
  },
);
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #909399;
}

.loading-container p {
  margin-top: 16px;
  font-size: 14px;
}

.empty-container {
  padding: 20px 0;
}

.config-list {
  max-height: 500px;
  overflow-y: auto;
}

.config-radio-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-radio-item {
  width: 100%;
  height: auto;
  padding: 16px;
  margin: 0;
}

.config-radio-item :deep(.el-radio__label) {
  width: 100%;
  padding-left: 12px;
}

.config-item-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.config-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.config-env {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.env-label {
  font-size: 12px;
  color: #909399;
}
</style>
