import request from './request';

/**
 * 后端 API 响应格式
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * OAuth 授权 URL 响应
 */
interface AuthorizationUrlData {
  url: string;
  state: string;
}

/**
 * OAuth Token 响应
 */
interface OAuthTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at?: string;
}

/**
 * 获取 OAuth 授权 URL
 * @returns 授权 URL 和 state 参数
 */
export async function getAuthorizationUrl(): Promise<AuthorizationUrlData> {
  // request 拦截器已经返回了 data，所以 response 就是后端的响应体
  const response = (await request.get(
    '/api/oauth/authorize-url',
  )) as ApiResponse<AuthorizationUrlData>;

  if (!response.success || !response.data) {
    const errorMsg = response.message || response.error || 'Failed to get authorization URL';
    throw new Error(errorMsg);
  }

  return response.data;
}

/**
 * 刷新 Access Token
 * @param refreshToken - Refresh Token
 * @returns Token 响应
 */
export async function refreshToken(refreshToken: string): Promise<OAuthTokenData> {
  const response = (await request.post('/api/oauth/refresh', {
    refresh_token: refreshToken,
  })) as ApiResponse<OAuthTokenData>;

  if (!response.success || !response.data) {
    throw new Error(response.message || response.error || 'Failed to refresh token');
  }

  return response.data;
}

/**
 * 使用授权码换取 access token
 * @param code - 授权码
 * @param state - state 参数（可选）
 * @returns Token 响应
 */
export async function exchangeCodeForToken(code: string, state?: string): Promise<OAuthTokenData> {
  // request 拦截器已经返回了 data，所以 response 就是后端的响应体
  const response = (await request.post('/api/oauth/token', {
    code,
    state,
  })) as ApiResponse<OAuthTokenData>;

  if (!response.success || !response.data) {
    throw new Error(response.message || response.error || 'Failed to exchange token');
  }

  return response.data;
}
