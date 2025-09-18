import Docker from 'dockerode';
import { createLogger } from '@gitany/shared';

const dockerode = new Docker();

async function ensureDocker() {
  try {
    await dockerode.ping();
  } catch {
    throw new Error('Docker daemon is not available. Ensure Docker is running.');
  }
}

// No local filesystem/container image build needed; use official Node images.
export const docker = new Proxy(dockerode, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);
    if (typeof original === 'function') {
      return async function (...args: unknown[]) {
        await ensureDocker();
        return (original as (...args: unknown[]) => unknown).apply(target, args);
      };
    }
    return original;
  },
});

export const logger = createLogger('@gitany/core');

/** Forwarded Claude related env vars */
const anthropicEnvVars = Object.keys(process.env).filter((key) =>
  key.startsWith('ANTHROPIC_'),
);

export const forward = [
  ...anthropicEnvVars,
  'API_TIMEOUT_MS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
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
