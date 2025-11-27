import { GitCodeClient } from '@xbghc/gitcode-api';
import {
  getToken,
  getOAuthToken,
  saveOAuthToken,
  removeToken,
  removeOAuthToken,
} from './config.js';

type WithClientErrorHandler = string | ((error: unknown) => void | string | Promise<void | string>);

interface WithClientOptions {
  onNotFound?: (error: Error) => void;
}

/**
 * 创建已认证的 GitCode 客户端
 *
 * 支持两种认证方式:
 * - OAuth: 自动检查过期并刷新 token
 * - PAT: 直接使用 token
 *
 * 当 API 返回 401 时，自动清理失效的 token 并提示用户重新登录
 */
export async function createAuthenticatedClient(): Promise<GitCodeClient> {
  const oauthData = getOAuthToken();

  // 401 处理：清理 token 并提示
  const onUnauthorized = () => {
    removeToken();
    removeOAuthToken();
    console.error('Token 已失效，已自动移除。请重新登录: gitcode auth login');
  };

  if (oauthData) {
    // 使用 OAuth - 支持自动刷新
    const client = new GitCodeClient(undefined, { onUnauthorized });

    // 设置 OAuth token
    client.auth.setOAuthToken({
      access_token: oauthData.accessToken,
      refresh_token: oauthData.refreshToken,
      expires_in: Math.floor((oauthData.expiresAt - Date.now()) / 1000),
      scope: oauthData.scope,
      token_type: oauthData.tokenType,
    });

    // 获取有效 token（自动刷新如果过期）
    try {
      await client.auth.getValidToken();

      // 如果刷新了，保存新 token
      const newState = client.auth.getOAuthState();
      if (newState && newState.accessToken !== oauthData.accessToken) {
        saveOAuthToken({
          accessToken: newState.accessToken,
          refreshToken: newState.refreshToken,
          expiresAt: newState.expiresAt,
          scope: oauthData.scope,
          tokenType: oauthData.tokenType,
        });
        console.log('OAuth token 已自动刷新');
      }
      return client;
    } catch {
      // 刷新失败，清理并提示重新登录
      removeOAuthToken();
      throw new Error('OAuth token 已过期且无法刷新，请重新登录: gitcode auth login');
    }
  }

  // 使用 PAT
  const token = getToken();
  return new GitCodeClient(token, { onUnauthorized });
}

export async function withClient(
  fn: (client: GitCodeClient) => Promise<void>,
  errorHandler: WithClientErrorHandler = 'GitCode client operation failed',
  options: WithClientOptions = {},
): Promise<void> {
  try {
    const client = await createAuthenticatedClient();
    await fn(client);
  } catch (error) {
    if (error instanceof Error && /\b404\b/.test(error.message)) {
      if (options.onNotFound) {
        options.onNotFound(error);
        return;
      }
    }

    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof errorHandler === 'string') {
      message = errorHandler;
    } else {
      message = 'GitCode client operation failed';
    }

    if (typeof errorHandler === 'function') {
      try {
        const result = await errorHandler(error);
        if (typeof result === 'string' && result.trim().length > 0) {
          message = result;
        }
      } catch (handlerError) {
        console.error('withClient error handler threw:', handlerError);
      }
    }

    console.error(message, error);
    process.exit(1);
  }
}
