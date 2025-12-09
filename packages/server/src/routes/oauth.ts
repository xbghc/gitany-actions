import { Router, type Request, type Response } from 'express';
import { OAuthService } from '../services/oauth-service.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ServiceUnavailableError, ExternalServiceError } from '../errors/index.js';

export const oauthRouter: Router = Router();

// 创建 OAuth 服务实例（如果配置缺失会抛出错误）
let oauthService: OAuthService | null = null;

try {
  oauthService = new OAuthService();
} catch (error) {
  logger.warn(
    { error: error instanceof Error ? error.message : error },
    'OAuth service not configured',
  );
}

/**
 * 生成 OAuth 授权 URL
 * GET /api/oauth/authorize-url
 */
oauthRouter.get('/oauth/authorize-url', (_req: Request, res: Response) => {
  if (!oauthService) {
    throw new ServiceUnavailableError(
      'OAuth service not configured. Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
    );
  }

  try {
    const { url, state } = oauthService.getAuthorizationUrl();

    res.json({
      success: true,
      data: { url, state },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate authorization URL');
    throw new ExternalServiceError('OAuth', 'Failed to generate authorization URL', error as Error);
  }
});

/**
 * 使用授权码换取 access token
 * POST /api/oauth/token
 * Body: { code: string, state?: string }
 */
oauthRouter.post('/oauth/token', async (req: Request, res: Response) => {
  if (!oauthService) {
    throw new ServiceUnavailableError(
      'OAuth service not configured. Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
    );
  }

  const { code } = req.body;

  if (!code) {
    throw new ValidationError('Missing authorization code');
  }

  try {
    const tokenResponse = await oauthService.exchangeCodeForToken(code);

    logger.info('OAuth token exchanged successfully');

    res.json({
      success: true,
      data: tokenResponse,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to exchange token');
    throw new ExternalServiceError('OAuth', 'Failed to exchange token', error as Error);
  }
});

/**
 * 刷新过期的 access token
 * POST /api/oauth/refresh
 * Body: { refresh_token: string }
 */
oauthRouter.post('/oauth/refresh', async (req: Request, res: Response) => {
  if (!oauthService) {
    throw new ServiceUnavailableError(
      'OAuth service not configured. Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
    );
  }

  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new ValidationError('Missing refresh token');
  }

  try {
    const tokenResponse = await oauthService.refreshAccessToken(refresh_token);

    logger.info('OAuth token refreshed successfully');

    res.json({
      success: true,
      data: tokenResponse,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to refresh token');
    throw new ExternalServiceError('OAuth', 'Failed to refresh token', error as Error);
  }
});
