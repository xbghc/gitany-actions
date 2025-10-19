import { GitcodeClient } from '@xbghc/gitcode-api';

/**
 * Auth 配置接口
 */
interface AuthConfig {
  token?: string;
  authStyle?: 'query' | 'bearer' | 'token' | 'header';
  customAuthHeader?: string;
}

/**
 * Auth 存储接口
 */
interface AuthStorage {
  read(): Promise<AuthConfig | null>;
  write(cfg: AuthConfig): Promise<void>;
  clear(): Promise<void>;
}

/**
 * 内存中的 Token 存储（不写入文件）
 * 用于为每个请求提供独立的 token
 */
class MemoryAuthStorage implements AuthStorage {
  private config: AuthConfig | null = null;

  constructor(token: string) {
    this.config = { token };
  }

  async read(): Promise<AuthConfig | null> {
    return this.config;
  }

  async write(cfg: AuthConfig): Promise<void> {
    this.config = cfg;
  }

  async clear(): Promise<void> {
    this.config = null;
  }
}

/**
 * 创建一个带有指定 token 的 GitcodeClient 实例
 * @param token - GitCode API token
 * @returns GitcodeClient 实例
 */
export function createGitcodeClient(token: string): GitcodeClient {
  const client = new GitcodeClient();

  // 使用内存存储替换默认的文件存储
  const memoryStorage = new MemoryAuthStorage(token);
  (client.auth as any).storage = memoryStorage;

  return client;
}
