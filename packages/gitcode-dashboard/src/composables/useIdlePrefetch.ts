/**
 * Idle Prefetch Composable
 * 在浏览器空闲时预取数据，优化性能
 */

import { onUnmounted } from 'vue';

/**
 * 扩展 Window 类型以包含 requestIdleCallback
 */
type WindowWithIdleCallback = Window & {
  requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback: (handle: number) => void;
};

/**
 * 类型守卫：检查浏览器是否支持 requestIdleCallback
 */
function supportsIdleCallback(win: Window): win is WindowWithIdleCallback {
  return 'requestIdleCallback' in win && 'cancelIdleCallback' in win;
}

/**
 * Idle Prefetch Hook
 */
export function useIdlePrefetch() {
  let timeoutHandle: number | null = null;

  /**
   * 调度一个空闲时执行的回调
   * @param callback 要执行的回调函数
   * @param timeout 超时时间（毫秒），超时后强制执行
   */
  const scheduleIdlePrefetch = (callback: () => void, timeout = 2000): void => {
    // 取消之前的调度
    cancelIdlePrefetch();

    // 仅在支持 requestIdleCallback 时进行预取
    if (supportsIdleCallback(window)) {
      timeoutHandle = window.requestIdleCallback(callback, { timeout });
    }
  };

  /**
   * 取消之前调度的空闲回调
   */
  const cancelIdlePrefetch = (): void => {
    if (timeoutHandle !== null && supportsIdleCallback(window)) {
      window.cancelIdleCallback(timeoutHandle);
      timeoutHandle = null;
    }
  };

  // 组件卸载时自动取消
  onUnmounted(() => {
    cancelIdlePrefetch();
  });

  return {
    scheduleIdlePrefetch,
    cancelIdlePrefetch,
  };
}
