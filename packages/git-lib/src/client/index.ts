import { runGit } from './run';
import { GitNotFoundError } from '../errors';
import { gitStatus } from '../commands/status';
import { gitShowFile } from '../commands/show';
import { gitBranch } from '../commands/branch';
import { gitCheckout } from '../commands/checkout';
import { gitFetch } from '../commands/fetch';
import { gitPush } from '../commands/push';
import { gitCommit } from '../commands/commit';
import { gitSetRemote } from '../commands/remote';
import { gitDiffCommits, DiffOptions } from '../commands/diff';
import { gitClone } from '../commands/clone';
import { GitAddOptions, gitAdd } from '../commands/add';

export class GitClient {
  constructor(public cwd: string = process.cwd()) {}

  async run(args: string[]) {
    try {
      return await runGit(args, { cwd: this.cwd });
    } catch (err) {
      if (err instanceof GitNotFoundError) {
        throw err;
      }
      throw err;
    }
  }

  async status() {
    return gitStatus(this);
  }

  async showFile(ref: string, filePath: string) {
    return gitShowFile(this, ref, filePath);
  }

  async branch(name: string, base?: string) {
    return gitBranch(this, name, base);
  }

  async checkout(name: string) {
    return gitCheckout(this, name);
  }

  async fetch(branch?: string, options: { remote?: string } = {}) {
    return gitFetch(this, branch, options);
  }

  async push(branch: string, options: { remote?: string } = {}) {
    return gitPush(this, branch, options);
  }

  async commit(message: string, options: { addAll?: boolean } = {}) {
    return gitCommit(this, message, options);
  }

  async setRemote(remote: string, url: string) {
    return gitSetRemote(this, remote, url);
  }

  async diffCommits(commit1: string, commit2: string, options: DiffOptions = {}) {
    return gitDiffCommits(this, commit1, commit2, options);
  }

  async clone(repo: string, directory?: string) {
    return gitClone(this, repo, directory);
  }

  async add(files?: string | string[], options: GitAddOptions = {}) {
    return gitAdd(this, files, options);
  }
}
