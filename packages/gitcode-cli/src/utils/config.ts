import Conf from 'conf';

/**
 * OAuth token 数据结构
 */
export interface OAuthTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix 时间戳（毫秒）
  scope: string;
  tokenType: string;
}

/**
 * GitCode 配置文件结构
 */
interface GitCodeConfig {
  token?: string; // Personal Access Token
  authStyle?: 'query' | 'bearer' | 'token' | 'header';
  customAuthHeader?: string;
  oauth?: OAuthTokenData; // OAuth token 数据
  editor?: string; // 默认编辑器
}

const config = new Conf<GitCodeConfig>({
  projectName: 'gitcode',
});

/**
 * 获取配置文件路径
 * @returns e.g. ~/.config/gitcode/config.json
 */
export function getConfigPath(): string {
  return config.path;
}

/**
 * 获取 token（优先级：环境变量 > 配置文件）
 * @returns token 字符串，如果不存在则返回 undefined
 */
export function getToken(): string | undefined {
  // 优先使用环境变量
  if (process.env.GITCODE_TOKEN) {
    return process.env.GITCODE_TOKEN;
  }
  // 其次从配置文件读取
  return config.get('token');
}

/**
 * 保存 token 到配置文件
 * @param token 要保存的 token
 */
export function saveToken(token: string): void {
  config.set('token', token);
}

/**
 * 删除配置文件中的 token
 */
export function removeToken(): void {
  config.delete('token');
}

/**
 * 保存 OAuth token 到配置文件
 * @param tokenData OAuth token 数据
 */
export function saveOAuthToken(tokenData: OAuthTokenData): void {
  config.set('oauth', tokenData);
  // 同时更新 token 字段以保持向后兼容
  config.set('token', tokenData.accessToken);
}

/**
 * 获取 OAuth token
 * @returns OAuth token 数据，如果不存在则返回 undefined
 */
export function getOAuthToken(): OAuthTokenData | undefined {
  return config.get('oauth');
}

/**
 * 检查 OAuth token 是否存在且有效（未过期）
 * @param bufferSeconds 提前多少秒判定为过期（默认 300 秒 = 5 分钟）
 * @returns true 表示 token 存在且未过期
 */
export function isOAuthTokenValid(bufferSeconds = 300): boolean {
  const tokenData = getOAuthToken();
  if (!tokenData) {
    return false;
  }

  const now = Date.now();
  const bufferMs = bufferSeconds * 1000;
  return tokenData.expiresAt - bufferMs > now;
}

/**
 * 删除 OAuth token
 */
export function removeOAuthToken(): void {
  const oauthAccessToken = config.get('oauth')?.accessToken;
  config.delete('oauth');

  // 如果 token 字段是 OAuth access token，也删除
  if (oauthAccessToken && config.get('token') === oauthAccessToken) {
    config.delete('token');
  }
}

/**
 * 获取认证类型
 * @returns 'oauth', 'token', 或 'none'
 */
export function getAuthType(): 'oauth' | 'token' | 'none' {
  if (config.get('oauth')) return 'oauth';
  if (config.get('token')) return 'token';
  return 'none';
}

/**
 * 获取默认编辑器配置
 * @returns 编辑器命令，如果未配置则返回 undefined
 */
export function getEditorConfig(): string | undefined {
  return config.get('editor');
}

/**
 * 设置默认编辑器配置
 * @param editor 编辑器命令
 */
export function setEditorConfig(editor: string): void {
  config.set('editor', editor);
}
