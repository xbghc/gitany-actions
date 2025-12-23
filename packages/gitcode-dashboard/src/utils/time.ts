import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useTimeAgo, type UseTimeAgoMessages } from '@vueuse/core';
import type { MaybeRefOrGetter } from 'vue';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 统一的中文本地化消息
const zhMessages: UseTimeAgoMessages = {
  justNow: '刚刚',
  past: (n: string | number) => (typeof n === 'string' && n.match(/\d/) ? `${n}前` : String(n)),
  future: (n: string | number) => (typeof n === 'string' && n.match(/\d/) ? `${n}后` : String(n)),
  month: (n: number, past: boolean) => (n === 1 ? (past ? '上个月' : '下个月') : `${n} 个月`),
  year: (n: number, past: boolean) => (n === 1 ? (past ? '去年' : '明年') : `${n} 年`),
  day: (n: number, past: boolean) => (n === 1 ? (past ? '昨天' : '明天') : `${n} 天`),
  week: (n: number, past: boolean) => (n === 1 ? (past ? '上周' : '下周') : `${n} 周`),
  hour: (n: number) => `${n} 小时`,
  minute: (n: number) => `${n} 分钟`,
  second: (n: number) => `${n} 秒`,
  invalid: '无效时间',
};

/**
 * 格式化为相对时间（静态版本）
 * 7天内显示相对时间，超过7天显示具体日期
 */
export function formatRelativeTime(time: string | number | Date | null | undefined): string {
  if (!time) {
    return '暂无数据';
  }

  const date = dayjs(time);
  if (!date.isValid()) {
    return '无效时间';
  }

  const now = dayjs();
  const diffDays = now.diff(date, 'day');

  // 超过7天，显示具体日期
  if (diffDays >= 7) {
    return date.format('YYYY/MM/DD HH:mm');
  }

  // 小于7天，显示相对时间
  return date.fromNow();
}

/**
 * 格式化为相对时间（响应式版本）
 * 返回实时更新的 ref，适用于需要动态刷新的场景
 */
export function useRelativeTime(time: MaybeRefOrGetter<string | number | Date>) {
  return useTimeAgo(time, { messages: zhMessages });
}

/**
 * 格式化为完整日期时间
 * 例如：2024/12/23 14:30
 */
export function formatDateTime(time: string | number | Date | null | undefined): string {
  if (!time) {
    return '暂无数据';
  }

  const date = dayjs(time);
  if (!date.isValid()) {
    return '无效时间';
  }

  return date.format('YYYY/MM/DD HH:mm');
}

/**
 * 格式化为简短日期
 * 例如：12-23，今日显示为"今日(12-23)"
 */
export function formatShortDate(
  time: string | number | Date,
  options?: { showToday?: boolean },
): string {
  const date = dayjs(time);
  if (!date.isValid()) {
    return '无效时间';
  }

  const dateStr = date.format('MM-DD');
  const isToday = date.isSame(dayjs(), 'day');

  if (options?.showToday && isToday) {
    return `今日(${dateStr})`;
  }

  return dateStr;
}

/**
 * 格式化为时间（仅时分）
 * 例如：14:30
 */
export function formatTime(time: string | number | Date): string {
  const date = dayjs(time);
  if (!date.isValid()) {
    return '无效时间';
  }

  return date.format('HH:mm');
}
