// packages/gitcode-dashboard/src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/store';

// 创建 axios 实例
const client = axios.create({
  baseURL: 'https://gitcode.com/api/v1', // 假设的 API base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
client.interceptors.request.use(
  (config) => {
    // 这里不能直接调用 useAuthStore()，因为它只能在 setup context 中使用。
    // 我们从 localStorage 直接获取 token。
    const token = localStorage.getItem('gitcode_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { client };
