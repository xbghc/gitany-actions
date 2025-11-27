import { http } from './request';
import type { UserProfile, ApiResponse } from '@/types';

/**
 * 获取当前用户信息
 */
export const getUserProfile = () => {
  return http.get<ApiResponse<UserProfile>>('/api/user');
};
