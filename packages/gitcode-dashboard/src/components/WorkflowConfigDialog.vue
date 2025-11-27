<template>
  <el-dialog
    :model-value="visible"
    :title="isEditMode ? '编辑 Workflow 配置' : '新建 Workflow 配置'"
    width="700px"
    @update:model-value="handleClose"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <!-- 配置名称 -->
      <el-form-item label="配置名称" prop="name">
        <el-input v-model="formData.name" placeholder="例如：构建和测试" clearable />
      </el-form-item>

      <!-- 步骤列表 -->
      <el-form-item label="执行步骤" required>
        <div class="steps-container">
          <div v-for="(step, stepIndex) in formData.steps" :key="stepIndex" class="step-item">
            <el-card shadow="hover">
              <div class="step-header">
                <span class="step-title">步骤 {{ stepIndex + 1 }}</span>
                <el-button
                  v-if="formData.steps.length > 1"
                  type="danger"
                  size="small"
                  text
                  @click="removeStep(stepIndex)"
                >
                  删除步骤
                </el-button>
              </div>

              <!-- 步骤名称 -->
              <el-form-item
                :prop="`steps.${stepIndex}.name`"
                :rules="rules.stepName"
                label="步骤名称"
                label-width="80px"
              >
                <el-input v-model="step.name" placeholder="例如：安装依赖" clearable />
              </el-form-item>

              <!-- 命令列表 -->
              <el-form-item
                :prop="`steps.${stepIndex}.commands`"
                :rules="rules.commands"
                label="命令列表"
                label-width="80px"
              >
                <div class="commands-container">
                  <div
                    v-for="(_command, cmdIndex) in step.commands"
                    :key="cmdIndex"
                    class="command-item"
                  >
                    <el-input
                      v-model="step.commands[cmdIndex]"
                      placeholder="例如：pnpm install"
                      clearable
                    >
                      <template #append>
                        <el-button
                          v-if="step.commands.length > 1"
                          type="danger"
                          text
                          @click="removeCommand(stepIndex, cmdIndex)"
                        >
                          删除
                        </el-button>
                      </template>
                    </el-input>
                  </div>
                  <el-button size="small" @click="addCommand(stepIndex)"> 添加命令 </el-button>
                </div>
              </el-form-item>
            </el-card>
          </div>

          <el-button type="primary" @click="addStep"> 添加步骤 </el-button>
        </div>
      </el-form-item>

      <!-- 环境变量 -->
      <el-form-item label="环境变量">
        <div class="env-container">
          <div v-for="(_value, key, index) in formData.env" :key="index" class="env-item">
            <el-input
              :model-value="key"
              placeholder="变量名"
              style="width: 200px"
              @input="(val: string) => updateEnvKey(key, val)"
            />
            <span class="env-separator">=</span>
            <el-input v-model="formData.env[key]" placeholder="变量值" style="flex: 1" clearable />
            <el-button type="danger" text @click="removeEnv(key)"> 删除 </el-button>
          </div>
          <el-button size="small" @click="addEnv"> 添加环境变量 </el-button>
        </div>
      </el-form-item>

      <!-- 超时时间 -->
      <el-form-item label="超时时间" prop="timeout">
        <el-input-number
          v-model="formData.timeout"
          :min="0"
          :step="60000"
          :precision="0"
          placeholder="毫秒"
        />
        <span class="timeout-hint">（毫秒，0 表示不限制）</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import type { WorkflowConfigStep, WorkflowConfig } from '@/types';
import { useWorkflowConfigStore } from '@/store';

interface Props {
  visible: boolean;
  config?: WorkflowConfig;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const configStore = useWorkflowConfigStore();
const formRef = ref<FormInstance>();
const saving = ref(false);
const isEditMode = ref(false);

// 表单数据
const formData = reactive<{
  name: string;
  steps: WorkflowConfigStep[];
  env: Record<string, string>;
  timeout: number;
}>({
  name: '',
  steps: [{ name: '', commands: [''] }],
  env: {},
  timeout: 0,
});

// 表单验证规则
const rules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  stepName: [{ required: true, message: '请输入步骤名称', trigger: 'blur' }],
  commands: [
    {
      validator: (_rule, value, callback) => {
        if (!value || value.length === 0 || value.every((cmd: string) => !cmd.trim())) {
          callback(new Error('至少添加一条命令'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

/**
 * 添加步骤
 */
const addStep = () => {
  formData.steps.push({ name: '', commands: [''] });
};

/**
 * 删除步骤
 */
const removeStep = (index: number) => {
  formData.steps.splice(index, 1);
};

/**
 * 添加命令
 */
const addCommand = (stepIndex: number) => {
  formData.steps[stepIndex].commands.push('');
};

/**
 * 删除命令
 */
const removeCommand = (stepIndex: number, cmdIndex: number) => {
  formData.steps[stepIndex].commands.splice(cmdIndex, 1);
};

/**
 * 添加环境变量
 */
const addEnv = () => {
  const key = `ENV_${Object.keys(formData.env).length + 1}`;
  formData.env[key] = '';
};

/**
 * 删除环境变量
 */
const removeEnv = (key: string) => {
  delete formData.env[key];
};

/**
 * 更新环境变量的 key
 */
const updateEnvKey = (oldKey: string, newKey: string) => {
  if (oldKey === newKey) return;
  if (newKey in formData.env) {
    ElMessage.warning('环境变量名已存在');
    return;
  }
  const value = formData.env[oldKey];
  delete formData.env[oldKey];
  formData.env[newKey] = value;
};

/**
 * 重置表单
 */
const resetForm = () => {
  formData.name = '';
  formData.steps = [{ name: '', commands: [''] }];
  formData.env = {};
  formData.timeout = 0;
  isEditMode.value = false;
  formRef.value?.clearValidate();
};

/**
 * 保存配置
 */
const handleSave = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  // 过滤空命令
  const cleanedSteps = formData.steps.map((step) => ({
    name: step.name,
    commands: step.commands.filter((cmd) => cmd.trim() !== ''),
  }));

  // 过滤空环境变量
  const cleanedEnv: Record<string, string> = {};
  Object.entries(formData.env).forEach(([key, value]) => {
    if (key.trim() && value.trim()) {
      cleanedEnv[key] = value;
    }
  });

  saving.value = true;
  let success = false;

  if (isEditMode.value && props.config) {
    // 更新配置
    success = await configStore.updateConfig(props.config.id, {
      name: formData.name,
      steps: cleanedSteps,
      env: Object.keys(cleanedEnv).length > 0 ? cleanedEnv : undefined,
      timeout: formData.timeout > 0 ? formData.timeout : undefined,
    });
  } else {
    // 创建配置
    success = await configStore.createConfig({
      name: formData.name,
      steps: cleanedSteps,
      env: Object.keys(cleanedEnv).length > 0 ? cleanedEnv : undefined,
      timeout: formData.timeout > 0 ? formData.timeout : undefined,
    });
  }

  saving.value = false;

  if (success) {
    emit('success');
    handleClose();
  }
};

/**
 * 关闭对话框
 */
const handleClose = () => {
  resetForm();
  emit('update:visible', false);
};

// 监听 visible 变化，打开时加载数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.config) {
        // 使用传入的配置对象
        formData.name = props.config.name;
        formData.steps = JSON.parse(JSON.stringify(props.config.steps));
        formData.env = props.config.env ? JSON.parse(JSON.stringify(props.config.env)) : {};
        formData.timeout = props.config.timeout || 0;
        isEditMode.value = true;
      } else {
        resetForm();
      }
    }
  },
);
</script>

<style scoped>
.steps-container {
  width: 100%;
}

.step-item {
  margin-bottom: 16px;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.step-title {
  font-weight: 600;
  font-size: 14px;
  color: #606266;
}

.commands-container {
  width: 100%;
}

.command-item {
  margin-bottom: 8px;
}

.env-container {
  width: 100%;
}

.env-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.env-separator {
  color: #909399;
  font-weight: bold;
}

.timeout-hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
