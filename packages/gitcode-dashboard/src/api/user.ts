import { http } from './request';
import type { ApiResponse } from './types';
import type { UserProfile } from '@/store/user';

/**
 * 获取当前用户信息
 */
export const getUserProfile = () => {
  return http.get<ApiResponse<UserProfile>>('/api/user');
};
