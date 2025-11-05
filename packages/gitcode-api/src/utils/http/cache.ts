import { isObjectLike } from '../types.js';
import type { HttpMethod, HttpRequestOptions } from './types.js';

export const etagStore = new Map<string, { etag: string; payload: unknown }>();
export const cacheHit = new WeakSet<object>();

export function isNotModified(value: unknown): boolean {
  return isObjectLike(value) && cacheHit.has(value);
}

export function buildCacheKey(
  method: HttpMethod,
  url: string,
  searchParams: HttpRequestOptions['searchParams'],
): string {
  if (!searchParams || Object.keys(searchParams).length === 0) {
    return `${method} ${url}`;
  }

  const entries = Object.entries(searchParams)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) {
        return aValue.localeCompare(bValue);
      }
      return aKey.localeCompare(bKey);
    });
  const query = entries.map(([key, value]) => `${key}=${value}`).join('&');
  return `${method} ${url}?${query}`;
}
