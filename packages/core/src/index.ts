/**
 * GitAny Core Package
 * 
 * 当前直接作为可执行文件，将来进行拆分
 */

import { GitcodeClient } from "@gitany/gitcode";

const client = new GitcodeClient();

const token = await client.auth.token();
if (!token) {
  console.error('请先通过环境变量 GITANY_TOKEN 设置访问令牌');
  process.exit(1);
}

console.log(token)