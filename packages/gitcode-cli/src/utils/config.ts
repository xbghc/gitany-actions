import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface GitCodeConfig {
  token?: string;
  authStyle?: 'query' | 'bearer' | 'token' | 'header';
  customAuthHeader?: string;
}

/**
 * 获取 GitCode 配置目录路径
 * @returns ~/.gitcode
 */
export function getConfigDir(): string {
  return join(homedir(), '.gitcode');
}

/**
 * 获取配置文件路径
 * @returns ~/.gitcode/config.json
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * 确保配置目录存在
 */
async function ensureConfigDir(): Promise<void> {
  const dir = getConfigDir();
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * 读取配置文件（同步）
 * @returns 配置对象，如果文件不存在则返回空对象
 */
export function readConfigSync(): GitCodeConfig {
  try {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
      return {};
    }
    const content = readFileSync(configPath, 'utf8');
    return JSON.parse(content) as GitCodeConfig;
  } catch (err) {
    console.error('Failed to read config:', err);
    return {};
  }
}

/**
 * 读取配置文件（异步）
 * @returns 配置对象，如果文件不存在则返回空对象
 */
export async function readConfig(): Promise<GitCodeConfig> {
  try {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
      return {};
    }
    const content = await readFile(configPath, 'utf8');
    return JSON.parse(content) as GitCodeConfig;
  } catch (err) {
    console.error('Failed to read config:', err);
    return {};
  }
}

/**
 * 写入配置文件
 * @param config 要写入的配置对象
 */
export async function writeConfig(config: GitCodeConfig): Promise<void> {
  await ensureConfigDir();
  const configPath = getConfigPath();
  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content, 'utf8');
}

/**
 * 更新配置文件（合并现有配置）
 * @param updates 要更新的配置项
 */
export async function updateConfig(updates: Partial<GitCodeConfig>): Promise<void> {
  const config = await readConfig();
  const newConfig = { ...config, ...updates };
  await writeConfig(newConfig);
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
  const config = readConfigSync();
  return config.token;
}

/**
 * 保存 token 到配置文件
 * @param token 要保存的 token
 */
export async function saveToken(token: string): Promise<void> {
  await updateConfig({ token });
}

/**
 * 删除配置文件中的 token
 */
export async function removeToken(): Promise<void> {
  const config = await readConfig();
  delete config.token;
  await writeConfig(config);
}
