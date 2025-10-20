<template>
  <div class="token-bar">
    <div class="token-bar-content">
      <div class="token-status">
        <span class="label">GitCode Token:</span>
        <el-tag :type="authStore.isConfigured ? 'success' : 'warning'" size="small">
          {{ authStore.isConfigured ? '已配置' : '未配置' }}
        </el-tag>
      </div>
      <el-button size="small" type="primary" @click="showDialog = true">
        {{ authStore.isConfigured ? '修改 Token' : '配置 Token' }}
      </el-button>
    </div>

    <!-- Token 配置对话框 -->
    <el-dialog v-model="showDialog" title="配置 GitCode Token" width="500px" :close-on-click-modal="false">
      <el-form>
        <el-form-item label="Access Token" required>
          <el-input
            v-model="tokenInput"
            type="password"
            placeholder="请输入 GitCode Access Token"
            show-password
          />
        </el-form-item>
        <el-alert
          title="如何获取 Token"
          type="info"
          :closable="false"
          style="margin-top: 12px"
        >
          访问 GitCode 个人设置 → 访问令牌 → 创建新令牌
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :disabled="!tokenInput.trim()">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/store';
import { ElMessage } from 'element-plus';

const authStore = useAuthStore();

const showDialog = ref(false);
const tokenInput = ref('');

onMounted(() => {
  authStore.loadToken();
});

const handleSave = () => {
  if (!tokenInput.value.trim()) {
    ElMessage.warning('请输入 Token');
    return;
  }

  authStore.setToken(tokenInput.value);
  ElMessage.success('Token 保存成功');
  showDialog.value = false;
  tokenInput.value = '';
};

const handleCancel = () => {
  showDialog.value = false;
  tokenInput.value = '';
};
</script>

<style scoped>
.token-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.token-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.token-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-status .label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}
</style>
