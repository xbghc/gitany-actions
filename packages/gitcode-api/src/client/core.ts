import got, { type Got } from 'got';
import { GitcodeClientUser } from './user/index.js';
import { GitcodeClientPr } from './pr/index.js';
import { GitcodeClientRepo } from './repo/index.js';
import { GitcodeClientIssue } from './issue/index.js';
import { GitcodeClientAuth } from './auth/index.js';

export class GitCodeClient {
  public readonly http: Got;
  pr = new GitcodeClientPr(this);
  repo = new GitcodeClientRepo(this);
  issue = new GitcodeClientIssue(this);
  user = new GitcodeClientUser(this);
  auth: GitcodeClientAuth;

  constructor(token?: string, customHttp?: Got) {
    if (customHttp) {
      // 使用外部传入的 got 实例
      this.http = customHttp;
    } else {
      // 创建默认的 got 实例
      this.http = got.extend({
        headers: {
          'accept': 'application/json',
          ...(token && { 'authorization': `Bearer ${token}` })
        }
      });
    }
    this.auth = new GitcodeClientAuth(this, token);
  }
}

// 保持向后兼容的别名
export { GitCodeClient as GitcodeClient };
