<template>
  <div class="oauth-callback">
    <el-row justify="center" align="middle" style="min-height: 100vh">
      <el-col :xs="22" :sm="18" :md="14" :lg="10" :xl="8">
        <el-card shadow="always">
          <!-- 错误状态 -->
          <template v-if="error">
            <el-result icon="error" title="授权失败" :sub-title="errorMessage">
              <template #extra>
                <el-button type="primary" @click="router.push('/')">返回首页</el-button>
              </template>
            </el-result>
          </template>

          <!-- 成功状态 -->
          <template v-else>
            <el-result icon="success" title="授权成功">
              <template #sub-title>
                <div class="subtitle-content">请将以下授权码复制到命令行中</div>
              </template>

              <template #extra>
                <div class="code-section">
                  <el-input v-model="authCode" readonly size="large" class="code-input" />

                  <el-button
                    type="primary"
                    size="large"
                    class="copy-button"
                    :icon="copied ? Check : DocumentCopy"
                    @click="copyCode"
                  >
                    {{ copied ? '已复制' : '复制授权码' }}
                  </el-button>
                </div>

                <el-divider>或</el-divider>

                <el-button
                  type="success"
                  size="large"
                  class="web-login-button"
                  :loading="webLoginLoading"
                  @click="loginDirectly"
                >
                  直接在网页中登录
                </el-button>

                <div class="hint-text">
                  如果您在使用 Web Dashboard，可以直接登录而无需复制授权码
                </div>
              </template>
            </el-result>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { DocumentCopy, Check } from '@element-plus/icons-vue';
import { useAuthStore } from '@/store';
import request from '@/api/request';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const authCode = ref('');
const state = ref('');
const error = ref(false);
const errorMessage = ref('');
const copied = ref(false);
const webLoginLoading = ref(false);

onMounted(() => {
  authCode.value = (route.query.code as string) || '';
  state.value = (route.query.state as string) || '';
  console.log(authCode);

  // 检查是否有错误参数
  const errorParam = route.query.error as string;
  const errorDesc = route.query.error_description as string;

  if (errorParam) {
    error.value = true;
    errorMessage.value = errorDesc || errorParam || '授权失败，请重试';
    return;
  }

  if (!authCode.value) {
    error.value = true;
    errorMessage.value = '未接收到授权码，请检查 URL 参数';
  }
});

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(authCode.value);
    copied.value = true;
    ElMessage.success('授权码已复制到剪贴板');

    // 3秒后重置复制状态
    setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch {
    ElMessage.error('复制失败，请手动选择并复制');
  }
};

const loginDirectly = async () => {
  if (!authCode.value) {
    ElMessage.error('授权码为空');
    return;
  }

  webLoginLoading.value = true;

  try {
    // 调用后端 API 交换 token
    const response = await request.post('/api/oauth/token', {
      code: authCode.value,
      state: state.value,
    });

    const { access_token } = response.data;

    // 保存 token 到 store
    authStore.setToken(access_token);

    ElMessage.success('登录成功！');

    // 跳转到首页
    setTimeout(() => {
      router.push('/');
    }, 1000);
  } catch (_err) {
    const err = _err as { response?: { data?: { message?: string } }; message?: string };
    const message = err.response?.data?.message || err.message || '登录失败';
    ElMessage.error(`登录失败: ${message}`);
  } finally {
    webLoginLoading.value = false;
  }
};
</script>

<style scoped>
.oauth-callback {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.subtitle-content {
  font-size: 16px;
  color: #606266;
  margin-top: 10px;
}

.code-section {
  margin: 30px 0;
}

.code-input {
  margin-bottom: 15px;
}

.code-input :deep(.el-input__inner) {
  font-family: 'Courier New', Courier, monospace;
  font-size: 16px;
  text-align: center;
  font-weight: bold;
  letter-spacing: 1px;
  padding: 12px 20px;
}

.copy-button {
  width: 100%;
}

.web-login-button {
  width: 100%;
  margin-bottom: 15px;
}

.hint-text {
  text-align: center;
  font-size: 13px;
  color: #909399;
  margin-top: 10px;
}

:deep(.el-card) {
  border-radius: 12px;
}

:deep(.el-result) {
  padding: 40px 20px;
}
</style>
