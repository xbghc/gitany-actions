import { GitcodeClient } from '../packages/gitcode/dist/index.js';
import { PnpmActions } from '../packages/pnpm-actions/dist/index.js';

const main = async () => {
  const repoUrl = process.argv[2] || 'https://gitcode.com/owner/repo.git';
  const client = new GitcodeClient();

  const prs = await client.pr.list(repoUrl, { state: 'open' });
  if (!prs.length) {
    console.log('No open pull requests');
    return;
  }
  const pr = prs[0];

  const actions = new PnpmActions(repoUrl);
  await actions.handle({ action: 'opened', pull_request: pr });

  const container = actions.getContainer(pr.id);
  if (!container) {
    console.error('Container not found');
    return;
  }

  const branchName = `claude-helloworld-${Date.now()}`;
  const cmd = [
    'cd /tmp/workspace',
    `git checkout -b ${branchName}`,
    "claude -p \"在项目根目录下创建HELLOWORLD.md文件，文件内容为'Hello World'\" --cwd /tmp/workspace",
    'git add HELLOWORLD.md',
    "git commit -m \"feat: add HELLOWORLD.md\"",
    `git push head HEAD:${branchName}`,
  ].join(' && ');

  const exec = await container.exec({
    Cmd: ['sh', '-lc', cmd],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  await new Promise((resolve, reject) => {
    stream.on('data', (d) => process.stdout.write(d));
    stream.on('end', async () => {
      const info = await exec.inspect();
      if (info.ExitCode !== 0) {
        reject(new Error(`exit code ${info.ExitCode}`));
      } else {
        resolve();
      }
    });
  });

  await client.pr.create(repoUrl, {
    title: 'feat: add HELLOWORLD.md',
    head: branchName,
    base: pr.head.ref,
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
