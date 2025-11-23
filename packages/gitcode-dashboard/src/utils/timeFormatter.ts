import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 格式化时间为友好的相对时间
 * @param time 时间 (时间戳、日期字符串或 Date 对象)
 * @returns 相对时间字符串
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
