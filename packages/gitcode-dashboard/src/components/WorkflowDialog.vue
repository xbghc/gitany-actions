<template>
  <el-dialog
    v-model="visible"
    :title="`运行 PR #${prNumber} 的测试`"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 配置表单 -->
    <el-form v-if="!workflowStarted" :model="config" label-width="120px">
      <el-form-item label="包管理器">
        <el-select v-model="config.packageManager" placeholder="选择包管理器" style="width: 100%">
          <el-option label="npm" value="npm" />
          <el-option label="pnpm" value="pnpm" />
          <el-option label="yarn" value="yarn" />
        </el-select>
      </el-form-item>

      <el-form-item label="Build 命令">
        <el-input
          v-model="config.buildCommand"
          placeholder="留空使用默认: {packageManager} run build"
        />
      </el-form-item>

      <el-form-item label="Lint 命令">
        <el-input
          v-model="config.lintCommand"
          placeholder="留空使用默认: {packageManager} run lint"
        />
      </el-form-item>

      <el-form-item label="Docker 镜像">
        <el-select v-model="config.baseImage" placeholder="选择基础镜像" style="width: 100%">
          <el-option label="node:22-alpine (轻量级, ~150MB)" value="node:22-alpine" />
          <el-option label="node:22 (标准版, ~1GB)" value="node:22" />
          <el-option label="node:20-alpine" value="node:20-alpine" />
          <el-option label="node:20" value="node:20" />
        </el-select>
      </el-form-item>

      <el-form-item label="镜像源">
        <div style="display: flex; gap: 8px; width: 100%">
          <el-select v-model="config.registryMirror" placeholder="选择镜像源" style="flex: 1">
            <el-option label="DaoCloud镜像源（推荐）" value="docker.m.daocloud.io" />
            <el-option label="1Panel镜像源" value="docker.1panel.live" />
            <el-option label="1ms镜像源" value="docker.1ms.run" />
            <el-option label="Rat镜像源" value="hub.rat.dev" />
            <el-option label="轩辕镜像源" value="docker.xuanyuan.me" />
            <el-option label="不使用镜像源（Docker Hub直连）" value="" />
          </el-select>
          <el-button :icon="Lightning" :loading="testingSingleMirror" @click="testCurrentMirror">
            测试
          </el-button>
        </div>
        <div style="margin-top: 4px; color: #909399; font-size: 12px">
          使用镜像源可大幅提升下载速度（2025年可用镜像源）
        </div>
      </el-form-item>

      <el-form-item label="超时时间">
        <el-input-number v-model="timeoutMinutes" :min="1" :max="60" placeholder="分钟" />
        <span style="margin-left: 8px; color: #909399">分钟</span>
      </el-form-item>

      <el-form-item>
        <el-button
          type="info"
          :icon="Lightning"
          :loading="testingAllMirrors"
          @click="testAllMirrorsFunc"
          style="width: 100%"
        >
          测试所有镜像源并查看速度排名
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 执行状态和日志 -->
    <div v-else class="workflow-output">
      <!-- 步骤状态 -->
      <div class="workflow-steps">
        <el-steps :active="activeStep" finish-status="success" align-center>
          <el-step
            v-for="step in steps"
            :key="step.name"
            :title="stepTitles[step.name] || step.name"
            :status="getStepStatus(step.status)"
            :class="{ 'step-clickable': true, 'step-selected': selectedStep === step.name }"
            @click="handleStepClick(step.name)"
          />
        </el-steps>
      </div>

      <!-- 整体状态 -->
      <div class="workflow-status">
        <el-tag :type="getStatusTagType(workflowStatus)" size="large">
          {{ getStatusText(workflowStatus) }}
        </el-tag>
      </div>

      <!-- 日志输出 -->
      <div class="log-container">
        <div class="log-header">
          <div class="log-header-info">
            <span v-if="currentStepInfo" class="step-title">
              {{ currentStepInfo.title }}
            </span>
            <span v-else class="step-title">实时日志</span>
            <el-tag
              v-if="currentStepInfo"
              :type="getStatusTagType(currentStepInfo.status)"
              size="small"
              style="margin-left: 8px"
            >
              {{ getStatusText(currentStepInfo.status) }}
            </el-tag>
            <span v-if="currentStepInfo?.subtask" class="subtask-info">
              · 当前任务: {{ currentStepInfo.subtask }}
            </span>
          </div>
          <el-button :icon="CopyDocument" size="small" @click="copyLogs"> 复制日志 </el-button>
        </div>
        <pre ref="logElement" class="log-output">{{ currentLogs }}</pre>
      </div>
    </div>

    <template #footer>
      <div v-if="!workflowStarted">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="starting" :icon="Promotion" @click="startWorkflow">
          开始测试
        </el-button>
      </div>
      <div v-else>
        <el-button @click="visible = false">关闭</el-button>
        <el-button
          v-if="workflowStatus === 'success' || workflowStatus === 'failed'"
          type="primary"
          @click="restartWorkflow"
        >
          重新测试
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 测试结果对话框 -->
  <el-dialog v-model="showTestResultsDialog" title="镜像源测试结果" width="700px">
    <el-table :data="testResults" style="width: 100%">
      <el-table-column prop="mirrorName" label="镜像源" width="200" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.success ? 'success' : 'danger'" size="small">
            {{ row.success ? '✅ 可用' : '❌ 失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="耗时" width="100">
        <template #default="{ row }">
          <span v-if="row.success">{{ (row.duration / 1000).toFixed(2) }}秒</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="速度" width="120">
        <template #default="{ row }">
          <span v-if="row.success && row.speed">{{ row.speed.toFixed(2) }} MB/s</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button
            v-if="row.success"
            type="primary"
            size="small"
            @click="selectMirror(row.mirror)"
          >
            选择
          </el-button>
          <el-tooltip v-else :content="row.error || '未知错误'" placement="top">
            <el-button type="info" size="small" disabled> 查看错误 </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 16px; color: #909399; font-size: 12px">
      💡 提示：速度越快的镜像源，拉取Docker镜像时越快。建议选择速度最快的镜像源。
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, Promotion, Lightning } from '@element-plus/icons-vue';
import {
  triggerPRWorkflow,
  createWorkflowStream,
  testRegistryMirror,
  testAllRegistryMirrors,
} from '@/api/workflow';
import type {
  TriggerPRWorkflowRequest,
  WorkflowStatus,
  WorkflowStep,
  SSEStepData,
  SSEOutputData,
  SSEErrorData,
  SSECompleteData,
  RegistryMirrorTestResult,
} from '@/types';

interface Props {
  modelValue: boolean;
  prNumber: number;
  owner: string;
  repo: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 配置
const config = ref<TriggerPRWorkflowRequest>({
  owner: props.owner,
  repo: props.repo,
  packageManager: 'pnpm',
  baseImage: 'node:22',
  registryMirror: 'docker.m.daocloud.io', // 默认使用DaoCloud镜像源
});

const timeoutMinutes = ref(30);

// 工作流状态
const workflowStarted = ref(false);
const starting = ref(false);
const workflowId = ref('');
const workflowStatus = ref<WorkflowStatus>('pending');
const steps = ref<WorkflowStep[]>([]);
const stepLogs = ref(new Map<string, string>()); // 按步骤分组的日志
const selectedStep = ref(''); // 当前选中的步骤
const currentSubtask = ref(new Map<string, string>()); // 当前正在执行的子任务
const logElement = ref<HTMLPreElement>();

// SSE 连接
let eventSource: EventSource | null = null;

// 镜像源测试相关
const testingSingleMirror = ref(false);
const testingAllMirrors = ref(false);
const showTestResultsDialog = ref(false);
const testResults = ref<RegistryMirrorTestResult[]>([]);

// 镜像源选项映射（2025年可用）
const registryMirrorOptions = [
  { label: 'DaoCloud镜像源（推荐）', value: 'docker.m.daocloud.io' },
  { label: '1Panel镜像源', value: 'docker.1panel.live' },
  { label: '1ms镜像源', value: 'docker.1ms.run' },
  { label: 'Rat镜像源', value: 'hub.rat.dev' },
  { label: '轩辕镜像源', value: 'docker.xuanyuan.me' },
  { label: '不使用镜像源（Docker Hub直连）', value: '' },
];

// 步骤标题映射
const stepTitles: Record<string, string> = {
  'fetch-pr': '获取 PR 信息',
  'verify-branch': '验证分支存在性',
  'docker-run': 'Docker 容器测试',
};

// 子任务模式映射（docker-run步骤的内部子任务）
const subtaskPatterns: Record<string, string> = {
  'Installing pnpm': '安装 pnpm',
  'Cloning repository': '克隆代码仓库',
  'Checking out branch': '切换分支',
  'Installing dependencies': '安装项目依赖',
  'Running build': '执行 Build 构建',
  'Running lint': '执行 Lint 检查',
  'All tests completed successfully': '全部测试完成',
};

/**
 * 从日志文本中解析子任务
 */
const parseSubtask = (text: string): string | null => {
  // 匹配 === xxx === 格式
  const match = text.match(/===\s*(.+?)\s*===/);
  if (match) {
    const taskName = match[1];
    // 返回中文映射，如果没有映射则返回原文
    return subtaskPatterns[taskName] || taskName;
  }
  return null;
};

// 当前激活的步骤索引
const activeStep = computed(() => {
  const runningIndex = steps.value.findIndex((s) => s.status === 'running');
  if (runningIndex !== -1) return runningIndex;

  const successCount = steps.value.filter((s) => s.status === 'success').length;
  return successCount;
});

// 当前显示的日志内容
const currentLogs = computed(() => {
  if (!selectedStep.value) return '';
  return stepLogs.value.get(selectedStep.value) || '暂无输出';
});

// 当前选中步骤的详细信息
const currentStepInfo = computed(() => {
  if (!selectedStep.value) return null;
  const step = steps.value.find((s) => s.name === selectedStep.value);
  return step
    ? {
        name: selectedStep.value,
        title: stepTitles[selectedStep.value] || selectedStep.value,
        status: step.status,
        subtask: currentSubtask.value.get(selectedStep.value) || null,
      }
    : null;
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
      return '测试通过';
    case 'failed':
      return '测试失败';
  }
};

/**
 * 开始工作流
 */
const startWorkflow = async () => {
  starting.value = true;

  try {
    config.value.timeout = timeoutMinutes.value * 60 * 1000;

    const response = await triggerPRWorkflow(props.prNumber, config.value);

    if (response.success && response.data) {
      workflowId.value = response.data.workflowId;
      workflowStarted.value = true;
      workflowStatus.value = 'pending';

      // 连接 SSE
      connectSSE();
    }
  } catch (error) {
    console.error('Failed to start workflow:', error);
    ElMessage.error('启动测试失败');
  } finally {
    starting.value = false;
  }
};

/**
 * 连接 SSE
 */
const connectSSE = () => {
  if (!workflowId.value) return;

  eventSource = createWorkflowStream(workflowId.value);

  eventSource.addEventListener('connected', (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    // 连接信息保存到第一个步骤
    const firstStep = steps.value[0]?.name || 'fetch-pr';
    const currentLog = stepLogs.value.get(firstStep) || '';
    stepLogs.value.set(
      firstStep,
      currentLog + `\n=== 已连接到 Workflow: ${data.workflowId} ===\n\n`,
    );
    scrollToBottom();
  });

  eventSource.addEventListener('step', (e: MessageEvent) => {
    const data: SSEStepData = JSON.parse(e.data);
    updateStep(data.name, data.status);

    // 将步骤状态变更保存到对应步骤的日志
    const statusText = getStatusText(data.status);
    const currentLog = stepLogs.value.get(data.name) || '';
    stepLogs.value.set(
      data.name,
      currentLog + `\n[步骤] ${stepTitles[data.name] || data.name}: ${statusText}\n`,
    );

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

    // 解析子任务（仅对docker-run步骤）
    if (data.step === 'docker-run') {
      const subtask = parseSubtask(data.text);
      if (subtask) {
        currentSubtask.value.set(data.step, subtask);
      }
    }

    scrollToBottom();
  });

  eventSource.addEventListener('error', (e: MessageEvent) => {
    const data: SSEErrorData = JSON.parse(e.data);
    // 将错误信息保存到对应步骤的日志
    const currentLog = stepLogs.value.get(data.step) || '';
    stepLogs.value.set(data.step, currentLog + `\n❌ 错误 [${data.step}]: ${data.message}\n`);

    // 自动选中出错的步骤，以便用户看到完整的错误消息
    selectedStep.value = data.step;

    scrollToBottom();
  });

  eventSource.addEventListener('complete', (e: MessageEvent) => {
    const data: SSECompleteData = JSON.parse(e.data);
    workflowStatus.value = data.status;

    // 将完成信息保存到最后一个步骤的日志
    const statusText = getStatusText(data.status);
    const lastStep = steps.value[steps.value.length - 1]?.name || 'docker-run';
    const currentLog = stepLogs.value.get(lastStep) || '';
    stepLogs.value.set(lastStep, currentLog + `\n\n=== 测试完成: ${statusText} ===\n`);
    scrollToBottom();

    // 关闭 SSE 连接
    closeSSE();

    if (data.status === 'success') {
      emit('success');
    }
  });

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    // 将连接中断信息保存到当前选中的步骤（如果有）
    if (selectedStep.value) {
      const currentLog = stepLogs.value.get(selectedStep.value) || '';
      stepLogs.value.set(selectedStep.value, currentLog + '\n\n⚠️  SSE 连接中断\n');
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

  if (status === 'running') {
    workflowStatus.value = 'running';
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
          logText += `\n=== ${stepTitles[step.name] || step.name} ===\n${stepLog}\n`;
        }
      });
    }
    await navigator.clipboard.writeText(logText);
    ElMessage.success('日志已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
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
 * 重新开始测试
 */
const restartWorkflow = () => {
  workflowStarted.value = false;
  workflowStatus.value = 'pending';
  steps.value = [];
  stepLogs.value.clear();
  selectedStep.value = '';
  currentSubtask.value.clear();
  workflowId.value = '';
  closeSSE();
};

/**
 * 关闭对话框
 */
const handleClose = () => {
  closeSSE();
};

/**
 * 处理步骤点击
 */
const handleStepClick = (stepName: string) => {
  selectedStep.value = stepName;
};

/**
 * 测试当前选中的镜像源
 */
const testCurrentMirror = async () => {
  testingSingleMirror.value = true;

  try {
    const selectedOption = registryMirrorOptions.find(
      (opt) => opt.value === config.value.registryMirror,
    );
    const mirrorName = selectedOption?.label || 'Docker Hub';

    // 使用当前选择的Docker镜像进行测试，更准确
    const testImage = config.value.baseImage || 'alpine:latest';

    const response = await testRegistryMirror(config.value.registryMirror, mirrorName, testImage);

    if (response.data) {
      const result = response.data;
      if (result.success) {
        ElMessage.success(
          `✅ ${result.mirrorName} 可用！\n测试镜像: ${testImage}\n耗时: ${(result.duration / 1000).toFixed(2)}秒\n速度: ${result.speed?.toFixed(2)} MB/s`,
        );
      } else {
        ElMessage.error(
          `❌ ${result.mirrorName} 不可用\n测试镜像: ${testImage}\n错误: ${result.error}\n提示: 可能是白名单限制，请尝试其他镜像源`,
        );
      }
    }
  } catch (error) {
    console.error('Failed to test mirror:', error);
    ElMessage.error('测试失败');
  } finally {
    testingSingleMirror.value = false;
  }
};

/**
 * 测试所有镜像源
 */
const testAllMirrorsFunc = async () => {
  testingAllMirrors.value = true;

  try {
    // 使用当前选择的Docker镜像进行测试
    const testImage = config.value.baseImage || 'alpine:latest';

    const response = await testAllRegistryMirrors(testImage);

    if (response.data) {
      testResults.value = response.data;
      showTestResultsDialog.value = true;
    }
  } catch (error) {
    console.error('Failed to test all mirrors:', error);
    ElMessage.error('测试失败');
  } finally {
    testingAllMirrors.value = false;
  }
};

/**
 * 选择测试结果中的镜像源
 */
const selectMirror = (mirror: string) => {
  config.value.registryMirror = mirror;
  showTestResultsDialog.value = false;
  ElMessage.success('已切换镜像源');
};

// 监听对话框打开
watch(visible, (newVal) => {
  if (newVal) {
    // 重置状态
    restartWorkflow();
    config.value.owner = props.owner;
    config.value.repo = props.repo;
  }
});

// 监听当前日志变化，自动滚动（仅当选中步骤正在运行时）
watch(currentLogs, () => {
  // 检查当前选中步骤是否正在运行
  const runningStep = steps.value.find((s) => s.status === 'running');
  if (runningStep && selectedStep.value === runningStep.name) {
    scrollToBottom();
  }
});
</script>

<style scoped>
.workflow-output {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workflow-steps {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
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

.workflow-status {
  display: flex;
  justify-content: center;
  padding: 8px 0;
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

.subtask-info {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
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
