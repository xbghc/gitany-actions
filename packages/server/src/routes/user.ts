import { Router, type Request, type Response } from 'express';
import { withAuth } from '../middleware/auth.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { isValidGitCodeImageUrl } from '../constants/allowed-domains.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../errors/index.js';

export const userRouter: Router = Router();

/**
 * 获取当前用户信息
 * GET /api/user
 */
userRouter.get(
  '/user',
  withAuth(async (_req, res, token) => {
    const client = createGitCodeClient(token);

    try {
      const userProfile = await client.user.getProfile();

      res.json({
        success: true,
        data: userProfile,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch user profile');
      throw new ExternalServiceError('GitCode', 'Failed to fetch user profile', error as Error);
    }
  }),
);

/**
 * 头像代理
 * GET /api/avatar-proxy?url=https://cdn-img.gitcode.com/...
 */
userRouter.get('/avatar-proxy', async (req: Request, res: Response) => {
  const avatarUrl = req.query.url as string;

  if (!avatarUrl) {
    throw new ValidationError('Missing avatar URL');
  }

  if (!isValidGitCodeImageUrl(avatarUrl)) {
    throw new ValidationError('Invalid avatar URL domain');
  }

  try {
    const response = await fetch(avatarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://gitcode.com/',
      },
    });

    if (!response.ok) {
      logger.warn({ avatarUrl, status: response.status }, 'Failed to fetch avatar from upstream');
      throw new ExternalServiceError(
        'Avatar Service',
        `Failed to fetch avatar: ${response.status}`,
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    logger.error({ avatarUrl, error }, 'Avatar proxy error');
    throw new ExternalServiceError('Avatar Service', 'Failed to proxy avatar', error as Error);
  }
});
