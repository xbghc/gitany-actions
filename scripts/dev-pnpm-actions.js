const main = async () => {
  const { GitcodeClient } = await import('../packages/gitcode/dist/index.js');
  const { PnpmActions } = await import('../packages/pnpm-actions/dist/index.js');

  const repoUrl =
    process.argv[2] || process.env.GITANY_DEV_REPO || 'https://gitcode.com/owner/repo.git';
  const client = new GitcodeClient();
  const actions = new PnpmActions(repoUrl);

  const seen = new Map(); // pr.id -> head sha

  const check = async () => {
    const prs = await client.pr.list(repoUrl, { state: 'all', page: 1, per_page: 20 });
    const current = new Set();
    for (const pr of prs) {
      current.add(pr.id);
      const prevSha = seen.get(pr.id);
      if (!prevSha && pr.state === 'open') {
        await actions.handle({ action: 'opened', pull_request: pr });
        seen.set(pr.id, pr.head.sha);
      } else if (prevSha && pr.state === 'open' && prevSha !== pr.head.sha) {
        await actions.handle({ action: 'synchronize', pull_request: pr });
        seen.set(pr.id, pr.head.sha);
      } else if (prevSha && pr.state !== 'open') {
        await actions.handle({ action: 'closed', pull_request: pr });
        seen.delete(pr.id);
      }
    }
    // Clean up PRs that disappeared from list (likely closed)
    for (const id of [...seen.keys()]) {
      if (!current.has(id)) {
        seen.delete(id);
      }
    }
  };

  await check();
  setInterval(() => {
    void check().catch((err) => console.error(err));
  }, 5000);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
