// Scratchpad script for experimenting with the GitClient helpers.
import { GitClient } from '../packages/git-lib/dist/index.js';

// const client = new GitClient('~/projects/MateChat');
const client = new GitClient();

// const result = await client.showFile('HEAD', 'package.json');
// const result = await client.branch('test-branch', true);

// --- test diff
// const commit1 = '27f882661c587abcfabd327fe34d8ef71c2a3092';
// const commit2 = '0a3b5c6b022c147655c375748ce88534d9bbc379';

// const result = await client.diffCommits(commit1, commit2, {nameOnly: true, diffFilter: 'M'});

// ------
// test clone
// const result = await client.clone('https://gitcode.com/xbghc/gitcode-demo.git', '~/projects/gitcode-demo2');

// ------
// test add
// const result = await client.add('./packages/git-lib/*');

console.log(result);
