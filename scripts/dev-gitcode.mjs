import { GitcodeClient } from '../packages/gitcode/dist/index.js';

import { watchPullRequest } from '../packages/core/dist/index.js';

const client = new GitcodeClient();

const token = await client.auth.token();
if (!token) {
  console.error('请先通过环境变量 GITANY_TOKEN 设置访问令牌');
  process.exit(1);
}

const repoUrl = 'https://gitcode.com/xbghc/gitcode-demo';

// const result = await client.pr.list(repoUrl, { state: 'all' });

// ---
// test get PR comments
const prNumber = 2;
const result = await client.pr.comments(repoUrl, prNumber, { per_page: 100 });

console.log(result);

process.exit(0);
const onClosed = () => {
  console.log('Pull request closed');
};

const onMerged = () => {
  console.log('Pull request merged');
};

const onOpen = () => {
  console.log('Pull request opened');
};

watchPullRequest(client, repoUrl, { onClosed, onMerged, onOpen });
