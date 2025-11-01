import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const TOKEN_KEY = 'gitcode_token';

export const useAuthStore = defineStore('auth', () => {
  // Token 状态
  const token = ref<string>('');

  // 计算属性：是否已配置
  const isConfigured = computed(() => token.value.trim().length > 0);

  // 设置 Token
  const setToken = (newToken: string) => {
    token.value = newToken.trim();
    if (token.value) {
      localStorage.setItem(TOKEN_KEY, token.value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  // 清除 Token
  const clearToken = () => {
    token.value = '';
    localStorage.removeItem(TOKEN_KEY);
  };

  // 从 localStorage 加载
  const loadToken = () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      token.value = savedToken;
    }
  };

  // 获取 Token（用于 API 请求）
  const getToken = () => token.value;

  return {
    token,
    isConfigured,
    setToken,
    clearToken,
    loadToken,
    getToken,
  };
});
