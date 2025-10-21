/**
 * SWR (Stale-While-Revalidate) 缓存工具
 *
 * 使用 IndexedDB 存储缓存数据，相比 localStorage:
 * - 容量更大（通常 50MB+，而 localStorage 仅 5-10MB）
 * - 异步 API，不阻塞主线程
 * - 支持结构化数据，无需序列化
 *
 * 策略：
 * 1. 优先返回缓存数据（即使可能过时）
 * 2. 后台自动刷新获取最新数据
 * 3. 数据返回后更新缓存和UI
 */

interface CacheItem<T> {
  key: string;
  data: T;
  timestamp: number;
  /** 记录数据中最新的 updated_at（用于增量更新判断） */
  lastUpdatedAt?: string;
}

interface CacheParams {
  owner: string;
  repo: string;
  page: number;
  per_page: number;
  state: string;
  type: 'pr' | 'issue';
}

const DB_NAME = 'swr_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'cache_store';
const CACHE_PREFIX = 'swr_';

/**
 * 初始化 IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * 生成缓存键
 */
export function generateCacheKey(params: CacheParams): string {
  const { type, owner, repo, page, per_page, state } = params;
  return `${CACHE_PREFIX}${type}_${owner}_${repo}_${state}_p${page}_s${per_page}`;
}

/**
 * 读取缓存
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CacheItem<T> | undefined;
        resolve(result ? result.data : null);
      };
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to read cache:', error);
    }
    return null;
  }
}

/**
 * 写入缓存
 */
export async function setCache<T>(key: string, data: T, lastUpdatedAt?: string): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const cacheItem: CacheItem<T> = {
        key,
        data,
        timestamp: Date.now(),
        lastUpdatedAt,
      };
      const request = objectStore.put(cacheItem);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to write cache:', error);
    }
  }
}

/**
 * 清除特定类型的所有缓存
 */
export async function clearCacheByType(
  type: 'pr' | 'issue',
  owner?: string,
  repo?: string
): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.openCursor();

      const prefix = owner && repo
        ? `${CACHE_PREFIX}${type}_${owner}_${repo}_`
        : `${CACHE_PREFIX}${type}_`;

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          if (cursor.key.toString().startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

/**
 * 清除所有 SWR 缓存
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to clear all cache:', error);
    }
  }
}

/**
 * 获取完整的缓存项（包含元数据）
 */
export async function getCacheItem<T>(key: string): Promise<CacheItem<T> | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CacheItem<T> | undefined;
        resolve(result || null);
      };
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to read cache item:', error);
    }
    return null;
  }
}

/**
 * 获取匹配特定前缀的所有缓存键
 */
export async function getCacheKeysByPrefix(prefix: string): Promise<string[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.openCursor();
      const keys: string[] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          const key = cursor.key.toString();
          if (key.startsWith(prefix)) {
            keys.push(key);
          }
          cursor.continue();
        } else {
          resolve(keys);
        }
      };
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to get cache keys:', error);
    }
    return [];
  }
}

/**
 * 获取合并后的所有已缓存数据（跨页合并）
 * @param cachePrefix 缓存键前缀（不包含页码部分）
 * @returns 合并后的数据数组
 */
export async function getMergedCache<T extends { id: number }>(
  cachePrefix: string
): Promise<T[]> {
  try {
    // 获取所有匹配的缓存键
    const keys = await getCacheKeysByPrefix(cachePrefix);

    if (keys.length === 0) {
      return [];
    }

    // 读取所有缓存数据
    const allData: T[] = [];

    for (const key of keys) {
      const cached = await getCache<T[]>(key);
      if (cached && Array.isArray(cached)) {
        allData.push(...cached);
      }
    }

    // 去重（使用 ID 作为唯一标识）
    const uniqueData = Array.from(
      new Map(allData.map(item => [item.id, item])).values()
    );

    return uniqueData;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to merge cache:', error);
    }
    return [];
  }
}
