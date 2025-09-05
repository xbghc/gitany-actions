import { GitcodeClient } from '@gitany/gitcode';

export async function oauthExchangeAuthorizationCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  baseUrl?: string; // API base, e.g., https://gitcode.com/api/v5
}): Promise<{ access_token: string; token_type?: string; [k: string]: unknown }> {
  const { code, clientId, clientSecret, baseUrl } = params;
  const client = new GitcodeClient({ baseUrl, token: null });
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
  });
  return await client.request(`/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  } as unknown as RequestInit);
}
