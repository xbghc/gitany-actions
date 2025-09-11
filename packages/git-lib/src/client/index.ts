import { runGit } from './run';
import { gitStatus } from '../commands/status';
import { gitShowFile } from '../commands/show';

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
}
