import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { GitcodeClient } from './client';

export type AuthConfig = {
  token?: string;
  baseUrl?: string;
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
    await fs.writeFile(this.filePath, JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 as number });
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
  const xdg = process.env.XDG_CONFIG_HOME;
  const win = process.env.APPDATA;
  const base = process.platform === 'win32' ? win || join(homedir(), 'AppData', 'Roaming') : xdg || join(homedir(), '.config');
  return join(base, 'gitany', 'gitcode.json');
}

export class GitcodeAuth {
  private storage: AuthStorage;
  constructor(storage: AuthStorage = new FileAuthStorage(defaultConfigPath())) {
    this.storage = storage;
  }

  async login(token: string, baseUrl?: string, authStyle?: AuthConfig['authStyle'], customAuthHeader?: string) {
    const cfg: AuthConfig = { token, baseUrl, authStyle, customAuthHeader };
    await this.storage.write(cfg);
  }

  async logout() {
    await this.storage.clear();
  }

  async load(): Promise<AuthConfig> {
    const envToken = process.env.GITCODE_TOKEN;
    const envBase = process.env.GITCODE_API_BASE;
    const envStyle = process.env.GITCODE_AUTH_STYLE as AuthConfig['authStyle'] | undefined;
    const envHeader = process.env.GITCODE_AUTH_HEADER;
    const disk = (await this.storage.read()) || {};
    return {
      token: envToken ?? disk.token,
      baseUrl: envBase ?? disk.baseUrl,
      authStyle: envStyle ?? disk.authStyle,
      customAuthHeader: envHeader ?? disk.customAuthHeader,
    };
  }

  async client(): Promise<GitcodeClient> {
    const cfg = await this.load();
    return new GitcodeClient({
      baseUrl: cfg.baseUrl,
      token: cfg.token ?? null,
      authStyle: cfg.authStyle,
      customAuthHeader: cfg.customAuthHeader,
    });
  }

  async status(): Promise<{ authenticated: boolean; tokenPresent: boolean; user?: unknown }> {
    const cfg = await this.load();
    const tokenPresent = !!cfg.token;
    if (!tokenPresent) return { authenticated: false, tokenPresent };
    try {
      const client = await this.client();
      // Many providers expose `/user`; allow override with env if docs differ.
      const whoamiPath = process.env.GITCODE_WHOAMI_PATH || '/user';
      const user = await client.request(whoamiPath, { method: 'GET' });
      return { authenticated: true, tokenPresent, user };
    } catch {
      return { authenticated: false, tokenPresent };
    }
  }
}
