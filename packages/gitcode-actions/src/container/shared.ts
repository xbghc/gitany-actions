import Docker from 'dockerode';

const dockerode = new Docker();

/**
 * Dockerode 同步工厂方法列表
 * 这些方法直接返回对象实例，不是 Promise
 */
const SYNC_FACTORY_METHODS = new Set([
  'getContainer',
  'getImage',
  'getVolume',
  'getPlugin',
  'getService',
  'getTask',
  'getNode',
  'getNetwork',
  'getSecret',
  'getConfig',
  'getExec',
]);

async function ensureDocker() {
  try {
    await dockerode.ping();
  } catch {
    throw new Error('Docker daemon is not available. Ensure Docker is running.');
  }
}

/**
 * Docker 客户端代理
 *
 * 关键修复：区分同步和异步方法
 * - 同步工厂方法（如 getContainer）：不能包装成 async，否则返回 Promise 而不是 Container 对象
 * - 异步方法（如 listContainers）：可以包装成 async
 */
export const docker = new Proxy(dockerode, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);

    if (typeof original === 'function') {
      // 同步工厂方法：立即返回对象，后台检查 Docker
      if (SYNC_FACTORY_METHODS.has(prop as string)) {
        return function (this: unknown, ...args: unknown[]) {
          // 启动异步检查，但不等待（避免阻塞）
          ensureDocker().catch((err) => {
            console.error('[Docker Daemon Check Failed]', err.message);
          });
          // 立即同步返回对象
          return (original as (...args: unknown[]) => unknown).apply(target, args);
        };
      }

      // 异步方法：等待 Docker 检查完成
      return async function (this: unknown, ...args: unknown[]) {
        await ensureDocker();
        return (original as (...args: unknown[]) => unknown).apply(target, args);
      };
    }

    return original;
  },
});

/** Forwarded Claude related env vars */
const anthropicEnvVars = Object.keys(process.env).filter((key) => key.startsWith('ANTHROPIC_'));

export const forward = [
  ...anthropicEnvVars,
  'API_TIMEOUT_MS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'GITCODE_TOKEN',
];

export function collectForwardEnv(): string[] {
  const values: string[] = [];
  for (const key of forward) {
    const value = process.env[key];
    if (value) {
      values.push(`${key}=${value}`);
    }
  }
  return values;
}
