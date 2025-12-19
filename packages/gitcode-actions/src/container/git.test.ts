import assert from 'node:assert';
import { test, describe, it } from 'node:test';
import { GitCommandBuilder } from './git.js';

describe('GitCommandBuilder', () => {
  it('should generate credential configuration command', () => {
    const cmd = GitCommandBuilder.configureCredentials();
    assert.strictEqual(
      cmd,
      'if [ -n "$GITCODE_TOKEN" ]; then git config --global url."https://oauth2:$GITCODE_TOKEN@gitcode.com".insteadOf "https://gitcode.com"; fi'
    );
  });

  it('should generate clone command', () => {
    const cmd = GitCommandBuilder.clone('https://gitcode.com/owner/repo', '/workspace');
    assert.strictEqual(cmd, 'git clone https://gitcode.com/owner/repo /workspace');
  });

  it('should generate fetch PR command', () => {
    const cmd = GitCommandBuilder.fetchPr(123);
    assert.strictEqual(cmd, 'git fetch origin pull/123/head:pr-123');
  });

  it('should generate checkout command', () => {
    const cmd = GitCommandBuilder.checkout('main');
    assert.strictEqual(cmd, 'git checkout main');
  });
});
