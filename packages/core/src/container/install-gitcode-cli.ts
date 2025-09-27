import path from 'node:path';
import { createRequire } from 'node:module';
import { rm } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { copyToContainer } from './copy-files';
import { installCli } from './install-cli';
import type { ExecuteStepOptions, StepResult } from './execute-step';

const require = createRequire(import.meta.url);
const execAsync = promisify(exec);

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

export async function installGitcodeCli(options: StepOptions): Promise<StepResult> {
  const packageJsonPath = require.resolve('@xbghc/gitcode-cli/package.json');
  const cliDir = path.dirname(packageJsonPath);

  const { stdout } = await execAsync('npm pack', { cwd: cliDir });
  const tarballFile = stdout.trim();
  const tarballPath = path.join(cliDir, tarballFile);

  try {
    const containerTarballPath = await copyToContainer({
      container: options.container,
      srcPath: tarballPath,
      containerPath: '/tmp/',
    });

    return await installCli({
      ...options,
      name: 'gitcode',
      script: `mkdir -p ~/.npm-global \
&& npm install -g "${containerTarballPath}" --prefix ~/.npm-global \
&& rm "${containerTarballPath}" \
&& gitcode -v`,
    });
  } finally {
    await rm(tarballPath, { force: true });
  }
}
