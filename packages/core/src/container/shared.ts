import Docker from 'dockerode';
import { createLogger } from '@gitany/shared';

// No local filesystem/container image build needed; use official Node images.
export const docker = new Docker();
export const logger = createLogger('@gitany/core');

/** Forwarded Claude related env vars */
const anthropicEnvVars = Object.keys(process.env).filter((key) => key.startsWith('ANTHROPIC_'));

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

export async function ensureDocker() {
  try {
    await docker.ping();
  } catch {
    throw new Error('Docker daemon is not available. Ensure Docker is running.');
  }
}
