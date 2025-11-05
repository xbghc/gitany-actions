import type { GitCodeClient } from '../core.js';

export type AuthConfig = {
  token?: string;
  authStyle?: 'query' | 'bearer' | 'token' | 'header';
  customAuthHeader?: string;
};

export class GitCodeClientAuth {
  private _token: string | undefined;

  constructor(
    private client: GitCodeClient,
    token?: string,
  ) {
    // Priority: provided token > environment variable
    this._token = token || process.env.GITCODE_TOKEN;
  }

  setToken(token: string) {
    this._token = token;
  }

  token(): string | undefined {
    return this._token;
  }
}
