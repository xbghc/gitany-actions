<template>
  <el-dialog
    :model-value="visible"
    :title="t('workflow.log_dialog_title')"
    width="900px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
    @close="handleClose"
  >
    <!-- 执行信息 -->
    <div v-if="workflowInfo" class="workflow-info">
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item :label="t('workflow.table.workflow_id')">{{
          workflowInfo.workflowId
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('workflow.table.pr_number')">
          #{{ workflowInfo.prNumber }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('workflow.table.status')">
          <el-tag :type="getStatusTagType(workflowInfo.status)" size="small">
            {{ getStatusText(workflowInfo.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('workflow.table.created_at')" :span="2">
          {{ formatTime(workflowInfo.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('workflow.table.completed_at')">
          {{ workflowInfo.completedAt ? formatTime(workflowInfo.completedAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 步骤状态 -->
    <div class="workflow-steps">
      <el-steps :active="activeStep" finish-status="success" align-center>
        <el-step
          v-for="step in steps"
          :key="step.name"
          :title="step.name"
          :status="getStepStatus(step.status)"
          :class="{ 'step-clickable': true, 'step-selected': selectedStep === step.name }"
          @click="handleStepClick(step.name)"
        />
      </el-steps>
    </div>

    <!-- 日志输出 -->
    <div class="log-container">
      <div class="log-header">
        <div class="log-header-info">
          <span class="step-title">
            {{ selectedStep || t('workflow.realtime_log') }}
          </span>
          <el-tag
            v-if="currentStepStatus"
            :type="getStatusTagType(currentStepStatus)"
            size="small"
            style="margin-left: 8px"
          >
            {{ getStatusText(currentStepStatus) }}
          </el-tag>
        </div>
        <el-button :icon="CopyDocument" size="small" @click="copyLogs">
          {{ t('workflow.copy_logs') }}
        </el-button>
      </div>
      <pre ref="logElement" class="log-output">{{ currentLogs }}</pre>
    </div>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { createWorkflowStream, getWorkflowStatus, getWorkflowLogDetail } from '@/api';
import { useRepoStore } from '@/store';
import { formatDateTime } from '@/utils/time';
import { useStatusText, getStatusTagType } from '@/utils/status';
import type {
  WorkflowStatus,
  WorkflowStep,
  SSEStepData,
  SSEOutputData,
  SSEErrorData,
  SSECompleteData,
  WorkflowResult,
} from '@/store/workflow';

interface Props {
  visible: boolean;
  workflowId: string;
  owner?: string;
  repo?: string;
}

const { t } = useI18n();
const { getStatusText } = useStatusText();
const repoStore = useRepoStore();

interface Emits {
  (e: 'update:visible', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 工作流信息
const workflowInfo = ref<WorkflowResult | null>(null);
const steps = ref<WorkflowStep[]>([]);
const stepLogs = ref(new Map<string, string>()); // 按步骤分组的日志
const selectedStep = ref(''); // 当前选中的步骤
const logElement = ref<HTMLPreElement>();

// SSE 连接
let eventSource: EventSource | null = null;

/**
 * 当前激活的步骤索引
 */
const activeStep = computed(() => {
  const runningIndex = steps.value.findIndex((s) => s.status === 'running');
  if (runningIndex !== -1) return runningIndex;

  const successCount = steps.value.filter((s) => s.status === 'success').length;
  return successCount;
});

/**
 * 当前显示的日志内容
 */
const currentLogs = computed(() => {
  if (!selectedStep.value) return '';
  return stepLogs.value.get(selectedStep.value) || t('workflow.no_output');
});

/**
 * 当前选中步骤的状态
 */
const currentStepStatus = computed(() => {
  if (!selectedStep.value) return null;
  const step = steps.value.find((s) => s.name === selectedStep.value);
  return step?.status || null;
});

/**
 * 获取步骤状态
 */
const getStepStatus = (status: WorkflowStatus) => {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'running':
      return 'process';
    default:
      return 'wait';
  }
};

/**
 * 格式化时间
 */
const formatTime = (time: string) => {
  return formatDateTime(time);
};

/**
 * 加载 workflow 信息
 */
const loadWorkflowInfo = async () => {
  if (!props.workflowId) return;

  try {
    // 优先尝试从内存中获取（运行中的workflow）
    const response = await getWorkflowStatus(props.workflowId);
    if (response.data) {
      workflowInfo.value = response.data;
      steps.value = response.data.steps || [];

      // 如果 workflow 已完成，直接从 response 加载步骤输出
      if (response.data.status === 'success' || response.data.status === 'failed') {
        steps.value.forEach((step) => {
          if (step.output) {
            stepLogs.value.set(step.name, step.output);
          }
        });

        // 自动选中第一个有输出的步骤
        const firstStepWithOutput = steps.value.find((s) => s.output);
        if (firstStepWithOutput) {
          selectedStep.value = firstStepWithOutput.name;
        }
      } else {
        // 如果 workflow 还在运行，连接 SSE
        connectSSE();
      }
    }
  } catch (error) {
    // 如果内存中不存在，尝试从持久化日志API获取
    const owner = props.owner || repoStore.currentOwner;
    const repo = props.repo || repoStore.currentRepo;

    if (owner && repo) {
      try {
        const logResponse = await getWorkflowLogDetail(owner, repo, props.workflowId);
        if (logResponse.data) {
          workflowInfo.value = logResponse.data;
          steps.value = logResponse.data.steps || [];

          // 加载步骤输出
          steps.value.forEach((step) => {
            if (step.output) {
              stepLogs.value.set(step.name, step.output);
            }
          });

          // 自动选中第一个有输出的步骤
          const firstStepWithOutput = steps.value.find((s) => s.output);
          if (firstStepWithOutput) {
            selectedStep.value = firstStepWithOutput.name;
          }
          return;
        }
      } catch (logError) {
        if (import.meta.env.DEV) {
          console.error('从日志API加载失败:', logError);
        }
      }
    }

    // 两种方式都失败
    if (import.meta.env.DEV) {
      console.error('加载 workflow 信息失败:', error);
    }
    ElMessage.error(t('workflow.load_failed'));
  }
};

/**
 * 连接 SSE
 */
const connectSSE = () => {
  if (!props.workflowId) return;

  eventSource = createWorkflowStream(props.workflowId);

  eventSource.addEventListener('connected', (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    // 连接信息保存到第一个步骤
    const firstStep = steps.value[0]?.name || 'step-1';
    const currentLog = stepLogs.value.get(firstStep) || '';
    stepLogs.value.set(
      firstStep,
      currentLog + `\n=== Connected to Workflow: ${data.workflowId} ===\n\n`,
    );
    scrollToBottom();
  });

  eventSource.addEventListener('step', (e: MessageEvent) => {
    const data: SSEStepData = JSON.parse(e.data);
    updateStep(data.name, data.status);

    // 将步骤状态变更保存到对应步骤的日志
    const statusText = getStatusText(data.status);
    const currentLog = stepLogs.value.get(data.name) || '';
    stepLogs.value.set(data.name, currentLog + `\n[Step] ${data.name}: ${statusText}\n`);

    // 自动选中正在运行或失败的步骤
    if (data.status === 'running' || data.status === 'failed') {
      selectedStep.value = data.name;
    }

    scrollToBottom();
  });

  eventSource.addEventListener('output', (e: MessageEvent) => {
    const data: SSEOutputData = JSON.parse(e.data);

    // 按步骤保存日志
    const currentLog = stepLogs.value.get(data.step) || '';
    stepLogs.value.set(data.step, currentLog + data.text);

    scrollToBottom();
  });

  eventSource.addEventListener('error', (e: MessageEvent) => {
    // 只有自定义 'error' 事件才会有 data 字段
    if (!e.data) {
      console.warn('收到空数据的 error 事件，可能是连接错误');
      return;
    }

    try {
      const data: SSEErrorData = JSON.parse(e.data);
      // 将错误信息保存到对应步骤的日志
      const currentLog = stepLogs.value.get(data.step) || '';
      stepLogs.value.set(data.step, currentLog + `\n❌ Error [${data.step}]: ${data.message}\n`);

      // 自动选中出错的步骤
      selectedStep.value = data.step;

      scrollToBottom();
    } catch (error) {
      console.error('解析 error 事件失败:', error, 'data:', e.data);
    }
  });

  eventSource.addEventListener('complete', (e: MessageEvent) => {
    const data: SSECompleteData = JSON.parse(e.data);

    if (workflowInfo.value) {
      workflowInfo.value.status = data.status;
    }

    // 将完成信息保存到最后一个步骤的日志
    const statusText = getStatusText(data.status);
    const lastStep = steps.value[steps.value.length - 1]?.name || 'step-final';
    const currentLog = stepLogs.value.get(lastStep) || '';
    stepLogs.value.set(lastStep, currentLog + `\n\n=== Complete: ${statusText} ===\n`);
    scrollToBottom();

    // 关闭 SSE 连接
    closeSSE();
  });

  eventSource.onerror = (e: Event) => {
    console.warn('SSE 连接错误:', e);
    // 将连接中断信息保存到当前选中的步骤（如果有）
    if (selectedStep.value) {
      const currentLog = stepLogs.value.get(selectedStep.value) || '';
      stepLogs.value.set(selectedStep.value, currentLog + '\n\n⚠️  SSE Disconnected\n');
    }
    closeSSE();
  };
};

/**
 * 更新步骤状态
 */
const updateStep = (name: string, status: WorkflowStatus) => {
  const existingStep = steps.value.find((s) => s.name === name);
  if (existingStep) {
    existingStep.status = status;
  } else {
    steps.value.push({ name, status });
  }
};

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    if (logElement.value) {
      logElement.value.scrollTop = logElement.value.scrollHeight;
    }
  });
};

/**
 * 复制日志
 */
const copyLogs = async () => {
  try {
    // 复制当前选中步骤的日志，如果没有选中则复制所有日志
    let logText = '';
    if (selectedStep.value) {
      logText = stepLogs.value.get(selectedStep.value) || '';
    } else {
      // 合并所有步骤的日志
      steps.value.forEach((step) => {
        const stepLog = stepLogs.value.get(step.name);
        if (stepLog) {
          logText += `\n=== ${step.name} ===\n${stepLog}\n`;
        }
      });
    }
    await navigator.clipboard.writeText(logText);
    ElMessage.success(t('workflow.log_copied'));
  } catch (error) {
    console.error('复制日志失败:', error);
    ElMessage.error(t('workflow.copy_failed'));
  }
};

/**
 * 关闭 SSE 连接
 */
const closeSSE = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
};

/**
 * 关闭对话框
 */
const handleClose = () => {
  closeSSE();
  workflowInfo.value = null;
  steps.value = [];
  stepLogs.value.clear();
  selectedStep.value = '';
  emit('update:visible', false);
};

/**
 * 处理步骤点击
 */
const handleStepClick = (stepName: string) => {
  selectedStep.value = stepName;
};

// 监听 visible 变化，打开时加载数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.workflowId) {
      loadWorkflowInfo();
    }
  },
  { immediate: true },
);

// 监听当前日志变化，自动滚动（仅当选中步骤正在运行时）
watch(currentLogs, () => {
  const runningStep = steps.value.find((s) => s.status === 'running');
  if (runningStep && selectedStep.value === runningStep.name) {
    scrollToBottom();
  }
});

// 组件卸载时关闭 SSE
onUnmounted(() => {
  closeSSE();
});
</script>

<style scoped>
.workflow-info {
  margin-bottom: 16px;
}

.workflow-steps {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

/* 步骤点击效果 */
.workflow-steps :deep(.el-step) {
  cursor: pointer;
  transition: all 0.3s ease;
}

.workflow-steps :deep(.el-step.step-clickable:hover) {
  transform: translateY(-2px);
}

.workflow-steps :deep(.el-step.step-selected .el-step__head) {
  border-color: #409eff;
  background: #ecf5ff;
}

.workflow-steps :deep(.el-step.step-selected .el-step__title) {
  color: #409eff;
  font-weight: 600;
}

.log-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: 500;
}

.log-header-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.step-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.log-output {
  margin: 0;
  padding: 12px;
  height: 400px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-output::-webkit-scrollbar {
  width: 8px;
}

.log-output::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.log-output::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-output::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>
