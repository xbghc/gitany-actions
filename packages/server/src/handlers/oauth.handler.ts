import type { ServerInferResponses } from '@ts-rest/core';
import type { OAuthContract } from '../contracts/oauth.contract.js';
import { OAuthService } from '../services/oauth-service.js';
import { logger } from '../utils/logger.js';

type OAuthResponses = ServerInferResponses<OAuthContract>;

// 创建 OAuth 服务实例
let oauthService: OAuthService | null = null;

try {
  oauthService = new OAuthService();
} catch (error) {
  logger.warn(
    { error: error instanceof Error ? error.message : error },
    'OAuth service not configured',
  );
}

export const oauthHandler = {
  getAuthorizeUrl: async (): Promise<OAuthResponses['getAuthorizeUrl']> => {
    if (!oauthService) {
      return {
        status: 503,
        body: {
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message:
            'OAuth service not configured. Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
        },
      };
    }

    try {
      const { url, state } = oauthService.getAuthorizationUrl();

      return {
        status: 200,
        body: {
          success: true,
          data: { url, state },
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate authorization URL');
      return {
        status: 500,
        body: {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to generate authorization URL',
        },
      };
    }
  },

  exchangeToken: async ({
    body,
  }: {
    body: { code: string; state?: string };
  }): Promise<OAuthResponses['exchangeToken']> => {
    if (!oauthService) {
      return {
        status: 503,
        body: {
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message:
            'OAuth service not configured. Please set GITCODE_OAUTH_CLIENT_ID and GITCODE_OAUTH_CLIENT_SECRET',
        },
      };
    }

    try {
      const tokenResponse = await oauthService.exchangeCodeForToken(body.code);

      logger.info('OAuth token exchanged successfully');

      return {
        status: 200,
        body: {
          success: true,
          data: tokenResponse,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to exchange token');
      return {
        status: 500,
        body: {
          success: false,
          error: 'EXTERNAL_SERVICE_ERROR',
          message: 'Failed to exchange token',
        },
      };
    }
  },
};
