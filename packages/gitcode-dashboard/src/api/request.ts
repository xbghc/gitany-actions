import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    const token = localStorage.getItem('gitcode_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  },
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;

    // 如果是直接返回的数据，直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }

    // 统一处理成功响应
    if (data.success !== false) {
      return data;
    }

    // 处理业务错误
    const errorMsg = data.message || data.error || '请求失败';
    ElMessage.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  },
  (error) => {
    // 处理 HTTP 错误
    const { response } = error;
    let errorMsg = '网络请求失败';

    if (response) {
      switch (response.status) {
        case 401:
          errorMsg = '未授权，请重新登录';
          // 可以在这里处理登录跳转
          break;
        case 403:
          errorMsg = '拒绝访问';
          break;
        case 404:
          errorMsg = '请求资源不存在';
          break;
        case 500:
          errorMsg = '服务器错误';
          break;
        case 503:
          errorMsg = '服务不可用';
          break;
        default:
          errorMsg = response.data?.message || response.data?.error || errorMsg;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMsg = '请求超时';
    } else if (error.message === 'Network Error') {
      errorMsg = '网络连接失败';
    }

    ElMessage.error(errorMsg);
    return Promise.reject(error);
  },
);

// 封装请求方法
export const http = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request.get(url, config);
  },

  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request.post(url, data, config);
  },

  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request.put(url, data, config);
  },

  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request.patch(url, data, config);
  },

  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request.delete(url, config);
  },
};

export default request;
