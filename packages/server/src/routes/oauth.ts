import { Router, type Request, type Response } from 'express';
import { OAuthService } from '../services/oauth-service.js';

export const oauthRouter: Router = Router();

// 创建 OAuth 服务实例（如果配置缺失会抛出错误）
let oauthService: OAuthService | null = null;

try {
  oauthService = new OAuthService();
} catch (error) {
  console.warn('OAuth service not configured:', error instanceof Error ? error.message : error);
}

/**
 * 生成 OAuth 授权 URL
 * GET /api/oauth/authorize-url
 */
oauthRouter.get('/oauth/authorize-url', (_req: Request, res: Response) => {
  try {
    if (!oauthService) {
      res.status(503).json({
        success: false,
        error: 'OAuth service not configured',
        message: 'Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
      });
      return;
    }

    const { url, state } = oauthService.getAuthorizationUrl();

    res.json({
      success: true,
      data: { url, state },
    });
  } catch (error) {
    console.error('Failed to generate authorization URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 使用授权码换取 access token
 * POST /api/oauth/token
 * Body: { code: string, state?: string }
 */
oauthRouter.post('/oauth/token', async (req: Request, res: Response) => {
  try {
    if (!oauthService) {
      res.status(503).json({
        success: false,
        error: 'OAuth service not configured',
        message: 'Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
      });
      return;
    }

    const { code } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code',
      });
      return;
    }

    const tokenResponse = await oauthService.exchangeCodeForToken(code);

    res.json({
      success: true,
      data: tokenResponse,
    });
  } catch (error) {
    console.error('Failed to exchange token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
