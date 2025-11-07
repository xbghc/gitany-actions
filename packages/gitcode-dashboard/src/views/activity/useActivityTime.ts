import { useTimeAgo, type UseTimeAgoMessages } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';

export function useActivityTime(time: MaybeRefOrGetter<string | number | Date>) {
  return useTimeAgo(time, {
    messages: {
      justNow: '刚刚',
      past: (n: string | number) => (typeof n === 'string' && n.match(/\d/) ? `${n}前` : String(n)),
      future: (n: string | number) =>
        typeof n === 'string' && n.match(/\d/) ? `${n}后` : String(n),
      month: (n: number, past: boolean) => (n === 1 ? (past ? '上个月' : '下个月') : `${n} 个月`),
      year: (n: number, past: boolean) => (n === 1 ? (past ? '去年' : '明年') : `${n} 年`),
      day: (n: number, past: boolean) => (n === 1 ? (past ? '昨天' : '明天') : `${n} 天`),
      week: (n: number, past: boolean) => (n === 1 ? (past ? '上周' : '下周') : `${n} 周`),
      hour: (n: number) => `${n} 小时`,
      minute: (n: number) => `${n} 分钟`,
      second: (n: number) => `${n} 秒`,
      invalid: '无效时间',
    } as UseTimeAgoMessages,
  });
}
