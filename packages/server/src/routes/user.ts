import { Router, type Request, type Response } from 'express';
import { withAuth } from '../middleware/auth.js';
import { createGitCodeClient } from '../utils/gitcode-client.js';
import { isValidGitCodeImageUrl } from '../constants/allowed-domains.js';

export const userRouter: Router = Router();

/**
 * 获取当前用户信息
 * GET /api/user
 */
userRouter.get(
  '/user',
  withAuth(async (_req, res, token) => {
    try {
      const client = createGitCodeClient(token);

      const userProfile = await client.user.getProfile();

      res.json({
        success: true,
        data: userProfile,
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * 头像代理
 * GET /api/avatar-proxy?url=https://cdn-img.gitcode.com/...
 */
userRouter.get('/avatar-proxy', async (req: Request, res: Response) => {
  try {
    const avatarUrl = req.query.url as string;

    if (!avatarUrl) {
      res.status(400).json({
        success: false,
        error: 'Missing avatar URL',
      });
      return;
    }

    if (!isValidGitCodeImageUrl(avatarUrl)) {
      res.status(400).json({
        success: false,
        error: 'Invalid avatar URL domain',
      });
      return;
    }

    const response = await fetch(avatarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://gitcode.com/',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        error: 'Failed to fetch avatar',
      });
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Avatar proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to proxy avatar',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
