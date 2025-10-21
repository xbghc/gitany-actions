// packages/gitcode-dashboard/src/directives/prefetch.ts
import { prefetchService } from '@/services/prefetch';
import type { Directive } from 'vue';

type PrefetchBinding = () => Promise<void>;

export const vPrefetch: Directive<HTMLElement, PrefetchBinding> = {
  mounted(el, binding) {
    const prefetcher = binding.value;
    if (typeof prefetcher !== 'function') {
      console.warn('[v-prefetch] binding value must be a function.');
      return;
    }

    const task = () => {
      // 移除事件监听器以避免重复触发
      el.removeEventListener('mouseenter', onMouseEnter);
      return prefetcher();
    };

    // 使用 URL 或函数体作为任务的唯一 ID
    const taskId = el.getAttribute('href') || prefetcher.toString();

    const onMouseEnter = () => {
      prefetchService.addTask(taskId, task, true);
    };

    el.addEventListener('mouseenter', onMouseEnter, { once: true });
  },
};
