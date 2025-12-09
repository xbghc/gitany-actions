import type { ServerInferResponses } from '@ts-rest/core';
import type { UserContract } from '../contracts/user.contract.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { logger } from '../utils/logger.js';
import { getTokenFromRequest } from '../utils/auth.js';
import type { Request } from 'express';

type UserResponses = ServerInferResponses<UserContract>;

export const userHandler = {
  getUserProfile: async ({ req }: { req: Request }): Promise<UserResponses['getUserProfile']> => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return {
        status: 401,
        body: { success: false, error: 'UNAUTHORIZED', message: 'GitCode token is required' },
      };
    }

    const client = createGitCodeClient(token);

    try {
      const userProfile = await client.user.getProfile();

      return {
        status: 200,
        body: { success: true, data: userProfile },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to fetch user profile');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to fetch user profile',
        },
      };
    }
  },

  // 注意：avatar-proxy 返回二进制图片，不适合用 ts-rest 处理
  // 这里提供一个空实现，实际使用传统 Express 路由
  getAvatarProxy: async (): Promise<UserResponses['getAvatarProxy']> => {
    // 这个端点通过传统 Express 路由实现
    // ts-rest 不适合处理二进制响应
    return {
      status: 200,
      body: null,
    };
  },
};
