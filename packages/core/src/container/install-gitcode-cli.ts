import path from 'node:path';
import { createRequire } from 'node:module';

import { copyToContainer } from './copy-files';
import { executeStep, type ExecuteStepOptions, type StepResult } from './execute-step';

const require = createRequire(import.meta.url);

const CLI_INSTALL_PATH = '/home/node/.gitany/gitcode-cli';
const CLI_BIN_PATH = '/home/node/.npm-global/bin/gitcode';

export type StepOptions = Omit<ExecuteStepOptions, 'name' | 'script'>;

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export async function installGitcodeCli({
  container,
  log,
  verbose,
  env,
}: StepOptions): Promise<StepResult> {
  const startTime = Date.now();
  try {
    const packageJsonPath = require.resolve('@gitany/cli/package.json');
    const cliDir = path.dirname(packageJsonPath);
    const pkg = require('@gitany/cli/package.json') as { bin?: Record<string, string> };
    const binRelative = pkg.bin?.gitcode ?? 'dist/index.js';
    const containerEntry = toPosixPath(path.posix.join(CLI_INSTALL_PATH, toPosixPath(binRelative)));

    await copyToContainer({
      container,
      srcPath: cliDir,
      containerPath: CLI_INSTALL_PATH,
      followSymlinks: true,
    });

    const script = `set -e
mkdir -p ~/.npm-global/bin
cat <<'GITCODE_BIN_EOF' > ${CLI_BIN_PATH}
#!/bin/sh
exec node "${containerEntry}" "$@"
GITCODE_BIN_EOF
chmod +x ${CLI_BIN_PATH}
mkdir -p ~/bin
ln -sf ${CLI_BIN_PATH} ~/bin/gitcode
if [ -w /usr/local/bin ]; then
  ln -sf ${CLI_BIN_PATH} /usr/local/bin/gitcode
fi
profile="$HOME/.profile"
touch "$profile"
if ! grep -Fq '.npm-global/bin' "$profile"; then
  printf '\\nexport PATH="$HOME/.npm-global/bin:$PATH"\\n' >> "$profile"
fi
`;

    const step = await executeStep({
      container,
      name: 'gitcode-cli-link',
      script,
      log,
      verbose,
      env,
    });

    const duration = Date.now() - startTime;
    return { success: step.success, duration, output: step.output } satisfies StepResult;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, duration, output: message } satisfies StepResult;
  }
}
