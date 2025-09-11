import { runGit } from './run';
import { gitStatus } from '../commands/status';
import { gitShowFile } from '../commands/show';
import { gitBranch } from '../commands/branch';
import { gitCheckout } from '../commands/checkout';
import { gitFetch } from '../commands/fetch';

export class GitClient {
  constructor(public cwd: string = process.cwd()) {}

  async run(args: string[]) {
    return runGit(args, { cwd: this.cwd });
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
}
