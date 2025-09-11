import { runGit } from './run';
import { gitStatus } from '../commands/status';
import { gitShowFile } from '../commands/show';
import { gitBranch } from '../commands/branch';
import { gitCheckout } from '../commands/checkout';

export class GitClient {
  constructor(public cwd: string) {}

  async run(args: string[], options?: { cwd?: string }) {
    return runGit(args, { cwd: options?.cwd });
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
}
