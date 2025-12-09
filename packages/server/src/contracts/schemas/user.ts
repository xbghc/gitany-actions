import { z } from 'zod';

// ========== 用户资料 ==========
export const UserProfileSchema = z.object({
  avatar_url: z.string().describe('用户头像 URL'),
  followers_url: z.string().describe('关注者列表 URL'),
  html_url: z.string().describe('用户主页 URL'),
  id: z.string().describe('用户 ID'),
  login: z.string().describe('用户登录名'),
  name: z.string().describe('用户显示名称'),
  type: z.string().describe('用户类型'),
  url: z.string().describe('用户 API URL'),
  bio: z.string().optional().describe('用户简介'),
  blog: z.string().optional().describe('用户博客 URL'),
  company: z.string().optional().describe('用户所在公司'),
  email: z.string().optional().describe('用户邮箱'),
  followers: z.number().describe('关注者数量'),
  following: z.number().describe('正在关注的数量'),
  top_languages: z.array(z.string()).describe('最常用的编程语言'),
});

// ========== 查询参数 ==========
export const AvatarProxyQuerySchema = z.object({
  url: z.string().url('Invalid avatar URL').describe('头像图片的完整 URL'),
});

// ========== 类型导出 ==========
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type AvatarProxyQuery = z.infer<typeof AvatarProxyQuerySchema>;
