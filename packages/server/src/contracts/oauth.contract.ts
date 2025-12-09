import { initContract } from '@ts-rest/core';
import { SuccessResponseSchema, ErrorResponseSchema } from './schemas/common.js';
import {
  AuthorizeUrlResponseSchema,
  ExchangeTokenBodySchema,
  TokenResponseSchema,
} from './schemas/oauth.js';

const c = initContract();

export const oauthContract = c.router(
  {
    // GET /api/oauth/authorize-url
    getAuthorizeUrl: {
      method: 'GET',
      path: '/oauth/authorize-url',
      responses: {
        200: SuccessResponseSchema(AuthorizeUrlResponseSchema),
        500: ErrorResponseSchema,
        503: ErrorResponseSchema,
      },
      summary: '获取 OAuth 授权 URL',
      description: '生成 GitCode OAuth 授权 URL',
    },

    // POST /api/oauth/token
    exchangeToken: {
      method: 'POST',
      path: '/oauth/token',
      body: ExchangeTokenBodySchema,
      responses: {
        200: SuccessResponseSchema(TokenResponseSchema),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
        503: ErrorResponseSchema,
      },
      summary: '换取访问令牌',
      description: '使用授权码换取 access token',
    },
  },
  {
    pathPrefix: '/api',
  },
);

export type OAuthContract = typeof oauthContract;
