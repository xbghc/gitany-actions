import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'gitcode_token';
const REFRESH_TOKEN_KEY = 'gitcode_refresh_token';

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
    const token = localStorage.getItem(TOKEN_KEY);
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

let isRefreshing = false;
let requests: Array<(token: string) => void> = [];
// 使用 WeakSet 记录已重试的请求配置，避免修改原始 config 对象
const retriedRequests = new WeakSet<AxiosRequestConfig>();

/**
 * 刷新 Token 逻辑
 * @param config 失败请求的配置
 * @returns Promise
 */
const handleTokenRefresh = async (config: AxiosRequestConfig) => {
  if (!isRefreshing) {
    isRefreshing = true;

    // 标记为正在重试
    if (config) {
      retriedRequests.add(config);
    }

    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // 使用一个新的 axios 实例来刷新 token，避免死循环
      // 注意：这里不能使用 request 实例，否则会进入拦截器死循环
      const { data } = await axios.post(
        `${baseURL}/api/oauth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (data.success && data.data) {
        const { access_token, refresh_token } = data.data;
        localStorage.setItem(TOKEN_KEY, access_token);
        if (refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
        }

        // 重试队列中的请求
        requests.forEach((cb) => cb(access_token));
        requests = [];
        isRefreshing = false;

        // 重试当前请求
        if (config && config.headers) {
          config.headers.Authorization = `Bearer ${access_token}`;
          return request(config);
        }
        return Promise.resolve();
      } else {
        throw new Error('Refresh token failed');
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      isRefreshing = false;
      requests = [];
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  } else {
    // 正在刷新，将请求加入队列
    return new Promise((resolve) => {
      requests.push((token) => {
        if (config && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          resolve(request(config));
        } else {
            resolve(Promise.reject('Config invalid'));
        }
      });
    });
  }
};

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
  async (error) => {
    // 处理 HTTP 错误
    const { response, config } = error;
    let errorMsg = '网络请求失败';

    if (response) {
      switch (response.status) {
        case 401:
          // 使用 WeakSet 检查防止死循环
          if (config && retriedRequests.has(config)) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            window.location.href = '/login';
            return Promise.reject(error);
          }

          // 如果是 401，尝试刷新 token
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

          if (refreshToken) {
            return handleTokenRefresh(config);
          } else {
            // 没有 refresh token，直接跳转登录
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            window.location.href = '/login';
          }
          break;
        case 403:
          errorMsg = '拒绝访问';
          ElMessage.error(errorMsg);
          break;
        case 404:
          errorMsg = '请求资源不存在';
          ElMessage.error(errorMsg);
          break;
        case 500:
          errorMsg = '服务器错误';
          ElMessage.error(errorMsg);
          break;
        case 503:
          errorMsg = '服务不可用';
          ElMessage.error(errorMsg);
          break;
        default:
          errorMsg = response.data?.message || response.data?.error || errorMsg;
          ElMessage.error(errorMsg);
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMsg = '请求超时';
      ElMessage.error(errorMsg);
    } else if (error.message === 'Network Error') {
      errorMsg = '网络连接失败';
      ElMessage.error(errorMsg);
    }

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
