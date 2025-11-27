<template>
  <div class="header">
    <div class="header-content">
      <el-dropdown @command="handleLanguageChange">
        <span class="language-selector">
          {{ currentLanguage }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="zh">中文</el-dropdown-item>
            <el-dropdown-item command="en">English</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <a
        v-if="userStore.userProfile"
        :href="userStore.userProfile.html_url"
        target="_blank"
        rel="noopener noreferrer"
        class="user-info"
      >
        <el-avatar :size="32" :src="userStore.userProfile.avatar_url">
          <el-icon><component :is="User" /></el-icon>
        </el-avatar>
        <span class="user-name">{{ userStore.displayName }}</span>
      </a>
      <el-button size="small" type="danger" @click="handleLogout">{{
        t('header.logout')
      }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useUserStore } from '@/store';
import { ElMessage } from 'element-plus';
import { User, ArrowDown } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const currentLanguage = computed(() => {
  return locale.value === 'zh' ? '中文' : 'English';
});

const handleLanguageChange = (lang: string) => {
  locale.value = lang;
  localStorage.setItem('language', lang);
};

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
  ElMessage.success(t('header.logged_out'));

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
  border-bottom: 1px solid #e4e7ed;
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

.language-selector {
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #606266;
  font-size: 14px;
}

.language-selector:hover {
  color: #409eff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.user-info:hover {
  background-color: #f3f4f6;
  transform: translateY(-1px);
}

.user-name {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.user-info:hover .user-name {
  color: #2563eb;
}
</style>
