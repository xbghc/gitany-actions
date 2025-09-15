import type Docker from 'dockerode';

import type { ContainerOptions } from './types';

export const containers = new Map<
  number,
  { container: Docker.Container; options: ContainerOptions }
>();
export const outputs = new Map<number, string>();
