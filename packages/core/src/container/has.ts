import { containers } from './shared';

export function hasPrContainer(prId: number) {
  return containers.has(prId);
}

