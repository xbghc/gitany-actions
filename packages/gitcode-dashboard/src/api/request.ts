import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
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

// 缓存正在进行的刷新 Promise，多个 401 请求共享同一个刷新过程
let refreshPromise: Promise<string> | null = null;

/**
 * 执行 Token 刷新
 * @returns Promise<string> 新的 access_token
 */
const doRefreshToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // 使用原生 axios，避免进入拦截器死循环
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
    return access_token;
  }

  throw new Error('Refresh token failed');
};

/**
 * 刷新 Token（带缓存，多个请求共享同一个刷新过程）
 * @returns Promise<string> 新的 access_token
 */
const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = doRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

/**
 * 清除 token 并跳转登录页
 */
const clearTokensAndRedirect = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.location.href = '/login';
};

/**
 * 处理 401 未授权错误
 * @param error Axios 错误对象
 * @param config 请求配置
 * @returns Promise
 */
const handle401Error = (error: AxiosError, config: InternalAxiosRequestConfig | undefined) => {
  // 无 refresh token，直接跳转登录
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearTokensAndRedirect();
    return Promise.reject(error);
  }

  // 刷新 token 并重试请求
  return refreshAccessToken()
    .then((token) => {
      if (config && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        return request(config);
      }
      return Promise.reject(new Error('Config invalid during retry'));
    })
    .catch((err) => {
      console.error('Token refresh failed:', err);
      clearTokensAndRedirect();
      return Promise.reject(err);
    });
};

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果是直接返回的数据，直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }

    const { data } = response;

    // 统一处理成功响应
    if (data.success !== false) {
      return data;
    }

    // 处理业务错误
    const errorMsg = data.message || data.error || '请求失败';
    ElMessage.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  },
  async (error: AxiosError) => {
    // 处理 HTTP 错误
    const { response, config } = error;
    let errorMsg = '网络请求失败';

    if (response) {
      switch (response.status) {
        case 401:
          return handle401Error(error, config);
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
        default: {
          const data = response.data as { message?: string; error?: string } | undefined;
          errorMsg = data?.message || data?.error || errorMsg;
          ElMessage.error(errorMsg);
        }
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
