import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { GitcodeClient } from '../core';

export type AuthConfig = {
  token?: string;
  authStyle?: 'query' | 'bearer' | 'token' | 'header';
  customAuthHeader?: string;
};

export interface AuthStorage {
  read(): Promise<AuthConfig | null>;
  write(cfg: AuthConfig): Promise<void>;
  clear(): Promise<void>;
}

export class FileAuthStorage implements AuthStorage {
  constructor(private filePath: string) {}

  async read(): Promise<AuthConfig | null> {
    try {
      const data = JSON.parse(await fs.readFile(this.filePath, 'utf8')) as AuthConfig;
      return data;
    } catch {
      return null;
    }
  }

  async write(cfg: AuthConfig): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(cfg, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }

  async clear(): Promise<void> {
    try {
      await fs.rm(this.filePath);
    } catch {
      // ignore
    }
  }
}

export function defaultConfigPath(): string {
  const dir = join(homedir(), '.gitany', 'gitcode');
  return join(dir, 'config.json');
}

export class GitcodeClientAuth {
  private storage: AuthStorage;

  constructor(
    private client: GitcodeClient,
    storage: AuthStorage = new FileAuthStorage(defaultConfigPath()),
  ) {
    this.storage = storage;
  }

  async setToken(token: string, authStyle?: AuthConfig['authStyle'], customAuthHeader?: string) {
    const cfg: AuthConfig = { token, authStyle, customAuthHeader };
    await this.storage.write(cfg);
  }

  async token(): Promise<string | undefined> {
    const envToken = process.env.GITCODE_TOKEN;
    if (envToken) {
      return envToken;
    }

    const disk = (await this.storage.read()) || {};
    const token = disk.token || undefined;
    return token;
  }
}
