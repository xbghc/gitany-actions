import { outputs } from './shared';

export function getPrContainerOutput(prId: number) {
  return outputs.get(prId) ?? null;
}

