import { runGit } from './run.js';
import { GitNotFoundError } from '../errors.js';
import { gitStatus } from '../commands/status.js';
import { gitShowFile } from '../commands/show.js';
import { gitBranch } from '../commands/branch.js';
import { gitCheckout } from '../commands/checkout.js';
import { gitFetch } from '../commands/fetch.js';
import { gitPush } from '../commands/push.js';
import { gitCommit } from '../commands/commit.js';
import { gitSetRemote } from '../commands/remote.js';
import { gitDiffCommits, DiffOptions } from '../commands/diff.js';
import { gitClone } from '../commands/clone.js';
import { GitAddOptions, gitAdd } from '../commands/add.js';
import type { GitResult } from '../types.js';

export type GitRunner = (args: string[]) => Promise<GitResult>;

function withGitNotFoundHandling(cwd?: string): GitRunner {
  return async (args: string[]) => {
    try {
      return await runGit(args, { cwd });
    } catch (err) {
      if (err instanceof GitNotFoundError) {
        throw new GitNotFoundError(
          'Git command not found. Please install Git and ensure it is in PATH.',
        );
      }
      throw err;
    }
  };
}

export function createGitRunner(cwd?: string): GitRunner {
  return withGitNotFoundHandling(cwd);
}

export function createGitClient(cwd: string = process.cwd()) {
  const run = withGitNotFoundHandling(cwd);

  return {
    cwd,
    run,
    status() {
      return gitStatus(run);
    },
    showFile(ref: string, filePath: string) {
      return gitShowFile(run, ref, filePath);
    },
    branch(name: string, base?: string) {
      return gitBranch(run, name, base);
    },
    checkout(name: string) {
      return gitCheckout(run, name);
    },
    fetch(branch?: string, options: { remote?: string } = {}) {
      return gitFetch(run, branch, options);
    },
    push(branch: string, options: { remote?: string } = {}) {
      return gitPush(run, branch, options);
    },
    commit(message: string, options: { addAll?: boolean } = {}) {
      return gitCommit(run, message, options);
    },
    setRemote(remote: string, url: string) {
      return gitSetRemote(run, remote, url);
    },
    diffCommits(commit1: string, commit2: string, options: DiffOptions = {}) {
      return gitDiffCommits(run, commit1, commit2, options);
    },
    clone(repo: string, directory?: string) {
      return gitClone(run, repo, directory);
    },
    add(files?: string | string[], options: GitAddOptions = {}) {
      return gitAdd(run, files, options);
    },
  };
}
