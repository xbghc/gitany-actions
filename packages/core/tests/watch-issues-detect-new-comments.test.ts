import assert from 'node:assert/strict';
import type { GitcodeClient, Issue, IssueComment } from '@gitany/gitcode';
import { IssueWatcher, type WatchIssueOptions } from '../src/issue/watcher';

class TestIssueWatcher extends IssueWatcher {
  async detect(issues: Issue[]) {
    await this.detectNewComments(issues);
  }
}

async function run() {
  const issues: Issue[] = [
    {
      id: 101,
      number: '1',
      html_url: 'https://gitcode.com/owner/repo/issues/1',
      state: 'open',
      title: 'First issue',
      body: '',
      user: {},
    },
    {
      id: 102,
      number: '2',
      html_url: 'https://gitcode.com/owner/repo/issues/2',
      state: 'open',
      title: 'Second issue',
      body: '',
      user: {},
    },
  ];

  const commentPhases: Array<Record<number, IssueComment[]>> = [
    {
      1: [
        {
          id: 1,
          body: 'Baseline note on issue 1',
          user: { login: 'alice' },
        },
      ],
      2: [
        {
          id: 10,
          body: 'Existing discussion on issue 2',
          user: { login: 'bob' },
        },
      ],
    },
    {
      1: [],
      2: [
        {
          id: 10,
          body: 'Existing discussion on issue 2',
          user: { login: 'bob' },
        },
        {
          id: 11,
          body: '@ai please check the second issue',
          user: { login: 'carol' },
        },
      ],
    },
    {
      1: [
        {
          id: 1,
          body: 'Baseline note on issue 1',
          user: { login: 'alice' },
        },
      ],
      2: [
        {
          id: 10,
          body: 'Existing discussion on issue 2',
          user: { login: 'bob' },
        },
        {
          id: 11,
          body: '@ai please check the second issue',
          user: { login: 'carol' },
        },
        {
          id: 12,
          body: '@ai another follow-up on the second issue',
          user: { login: 'dave' },
        },
      ],
    },
  ];

  let pollIndex = 0;

  const client = {
    issue: {
      async comments(_url: string, issueNumber: number) {
        const phase = commentPhases[pollIndex] ?? {};
        const comments = phase[issueNumber];
        return comments ? comments.map((comment) => ({ ...comment })) : [];
      },
    },
  } as unknown as GitcodeClient;

  const seen: Array<{ issue: Issue; comment: IssueComment }> = [];

  const options: WatchIssueOptions = {
    onComment: (issue, comment) => {
      seen.push({ issue, comment });
    },
  };

  const watcher = new TestIssueWatcher(client, 'https://gitcode.com/owner/repo.git', options);

  await watcher.detect(issues);
  assert.equal(seen.length, 0, 'first poll should only establish the baseline');
  assert.equal(watcher.getLastCommentId(1), 1, 'issue 1 baseline should be recorded');
  assert.equal(watcher.getLastCommentId(2), 10, 'issue 2 baseline should be recorded');

  pollIndex += 1;
  await watcher.detect(issues);
  assert.equal(
    seen.length,
    1,
    'second poll should detect a new mention on the later issue even when the first issue has no comments',
  );
  assert.equal(seen[0].issue.number, '2');
  assert.equal(seen[0].comment.id, 11);
  assert.equal(watcher.getLastCommentId(2), 11);

  pollIndex += 1;
  await watcher.detect(issues);
  assert.equal(
    seen.length,
    2,
    'third poll should continue scanning later issues when earlier issues have no new comments',
  );
  assert.equal(seen[1].issue.number, '2');
  assert.equal(seen[1].comment.id, 12);
  assert.equal(watcher.getLastCommentId(2), 12);

  console.log('✅ detectNewComments processes later issues with new mentions');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
