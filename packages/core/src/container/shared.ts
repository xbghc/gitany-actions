import Docker from 'dockerode';
import { createLogger } from '@gitany/shared';

import type { ContainerOptions } from './types';

// No local filesystem/container image build needed; use official Node images.
export const docker = new Docker();
export const logger = createLogger('@gitany/core');

/** Forwarded Claude related env vars */
export const forward = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'API_TIMEOUT_MS',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
];

export const containers = new Map<
  number,
  { container: Docker.Container; options: ContainerOptions }
>();
export const outputs = new Map<number, string>();

export async function ensureDocker() {
  try {
    await docker.ping();
  } catch {
    throw new Error('Docker daemon is not available. Ensure Docker is running.');
  }
}

