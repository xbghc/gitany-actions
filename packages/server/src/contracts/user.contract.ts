import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { SuccessResponseSchema, ErrorResponseSchema } from './schemas/common.js';
import { UserProfileSchema, AvatarProxyQuerySchema } from './schemas/user.js';

const c = initContract();

export const userContract = c.router(
  {
    // GET /api/user
    getUserProfile: {
      method: 'GET',
      path: '/user',
      responses: {
        200: SuccessResponseSchema(UserProfileSchema),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '获取当前用户信息',
      description: '获取已认证用户的详细资料信息',
    },

    // GET /api/avatar-proxy - 特殊处理，返回二进制
    // 注意：这个端点返回图片二进制，ts-rest 不太适合处理
    // 我们在契约中定义但实际用传统 Express 路由实现
    getAvatarProxy: {
      method: 'GET',
      path: '/avatar-proxy',
      query: AvatarProxyQuerySchema,
      responses: {
        200: z.unknown(), // 实际返回图片二进制
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: '头像代理',
      description: '代理转发 GitCode CDN 头像请求，解决跨域和防盗链问题',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type UserContract = typeof userContract;
