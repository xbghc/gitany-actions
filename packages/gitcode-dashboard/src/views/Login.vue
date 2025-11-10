<template>
  <div class="login-container">
    <div class="login-cards">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>欢迎使用</h1>
        <h1>GitCode Actions Dashboard</h1>
      </div>

      <!-- OAuth 登录卡片（可点击） -->
      <el-card class="oauth-card clickable" shadow="hover" @click="handleOAuthLogin">
        <div class="oauth-content">
          <el-icon :size="48" color="#409EFF">
            <component :is="UserFilled" />
          </el-icon>
          <h2>使用 GitCode 登录</h2>
          <p>通过 OAuth 2.0 安全授权登录</p>
        </div>
      </el-card>

      <!-- 分隔符 -->
      <div class="divider">
        <span>或</span>
      </div>

      <!-- PAT 登录卡片 -->
      <el-card class="token-card">
        <template #header>
          <div class="card-header">
            <h3>使用 Personal Access Token 登录</h3>
          </div>
        </template>

        <el-form @submit.prevent="handleTokenLogin">
          <el-form-item>
            <el-input
              v-model="tokenInput"
              type="password"
              placeholder="请输入 GitCode Access Token"
              show-password
              size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :disabled="!tokenInput.trim()"
              style="width: 100%"
              @click="handleTokenLogin"
            >
              登录
            </el-button>
          </el-form-item>

          <el-alert type="info" :closable="false">
            <template #title>
              <div>如何获取 Token？</div>
            </template>
            <div>访问 GitCode 个人设置 → 访问令牌 → 创建新令牌</div>
          </el-alert>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store';
import { ElMessage } from 'element-plus';
import { UserFilled } from '@element-plus/icons-vue';
import { getAuthorizationUrl } from '@/api/oauth';

const router = useRouter();
const authStore = useAuthStore();
const tokenInput = ref('');

// OAuth 登录
const handleOAuthLogin = async () => {
  try {
    // 1. 调用后端 API 获取授权 URL
    const { url } = await getAuthorizationUrl();

    // 2. 跳转到 GitCode 授权页面
    window.location.href = url;
  } catch (error) {
    console.error('OAuth login error:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    ElMessage.error({
      message: `OAuth 登录失败: ${errorMessage}`,
      duration: 5000,
    });
  }
};

// Token 登录
const handleTokenLogin = () => {
  if (!tokenInput.value.trim()) {
    ElMessage.warning('请输入 Token');
    return;
  }

  authStore.setToken(tokenInput.value.trim());
  ElMessage.success('登录成功');
  router.push('/');
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.login-cards {
  width: 100%;
  max-width: 450px;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #ffffff;
  font-weight: 600;
  line-height: 1.4;
}

/* OAuth 登录卡片 */
.oauth-card {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.oauth-card:hover {
  transform: translateY(-4px);
}

.oauth-card.clickable {
  cursor: pointer;
}

.oauth-content {
  text-align: center;
  padding: 24px 12px;
}

.oauth-content h2 {
  margin: 16px 0 8px 0;
  font-size: 20px;
  color: #1f2937;
}

.oauth-content p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

/* 分隔符 */
.divider {
  text-align: center;
  margin: 24px 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
}

.divider span {
  position: relative;
  display: inline-block;
  padding: 0 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

/* PAT 登录卡片 */
.token-card {
  border-radius: 12px;
}

.card-header {
  text-align: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
  font-weight: 600;
}
</style>
