import got, { type Got } from 'got';
import { GitCodeClientAuth } from './auth/index.js';
import { GitCodeClientIssue } from './issue/index.js';
import { GitCodeClientPr } from './pr/index.js';
import { GitCodeClientRepo } from './repo/index.js';
import { GitCodeClientUser } from './user/index.js';

export class GitCodeClient {
  public readonly http: Got;
  pr = new GitCodeClientPr(this);
  repo = new GitCodeClientRepo(this);
  issue = new GitCodeClientIssue(this);
  user = new GitCodeClientUser(this);
  auth: GitCodeClientAuth;

  constructor(token?: string, customHttp?: Got) {
    if (customHttp) {
      // 使用外部传入的 got 实例
      this.http = customHttp;
    } else {
      // 创建默认的 got 实例
      this.http = got.extend({
        headers: {
          accept: 'application/json',
          ...(token && { authorization: `Bearer ${token}` }),
        },
      });
    }
    this.auth = new GitCodeClientAuth(this, token);
  }
}
