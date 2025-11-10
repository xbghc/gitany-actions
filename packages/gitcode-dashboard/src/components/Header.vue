<template>
  <div class="header">
    <div class="header-content">
      <div v-if="userStore.userProfile" class="user-info">
        <el-avatar :size="32" :src="userStore.userProfile.avatar_url">
          <el-icon><component :is="User" /></el-icon>
        </el-avatar>
        <span class="user-name">{{ userStore.displayName }}</span>
      </div>
      <el-button size="small" type="danger" @click="handleLogout">注销</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useUserStore } from '@/store';
import { ElMessage } from 'element-plus';
import { User } from '@element-plus/icons-vue';

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

onMounted(() => {
  authStore.loadToken();
  if (authStore.isConfigured) {
    userStore.fetchUserProfile();
  }
});

const handleLogout = () => {
  // 清除认证数据
  authStore.clearToken();
  userStore.clearUserProfile();

  // 提示用户
  ElMessage.success('已注销');

  // 跳转到登录页
  router.push('/login');
};
</script>

<style scoped>
.header {
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

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 24px;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}
</style>
