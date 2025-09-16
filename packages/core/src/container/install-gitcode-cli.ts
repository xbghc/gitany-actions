import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { access, stat, mkdtemp, rm, cp } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

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
    await ensureLocalCliDirectory(cliDir);
    const staging = await createCliStagingDirectory(cliDir);
    const pkg = require('@gitany/cli/package.json') as { bin?: Record<string, string> };
    const binRelative = pkg.bin?.gitcode ?? 'dist/index.js';
    const containerEntry = toPosixPath(path.posix.join(CLI_INSTALL_PATH, toPosixPath(binRelative)));

    try {
      await ensureContainerTargetDirectory({ container, log, verbose, env });

      await copyToContainer({
        container,
        srcPath: staging.path,
        containerPath: CLI_INSTALL_PATH,
      });
    } finally {
      await staging.cleanup();
    }

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

async function ensureLocalCliDirectory(dir: string): Promise<void> {
  let stats;
  try {
    stats = await stat(dir);
  } catch {
    throw new Error(`Gitcode CLI 源目录不存在: ${dir}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Gitcode CLI 源路径不是目录: ${dir}`);
  }

  try {
    await access(dir, fsConstants.R_OK | fsConstants.X_OK);
  } catch {
    throw new Error(`无法读取 Gitcode CLI 源目录: ${dir}`);
  }
}

async function createCliStagingDirectory(dir: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const prefix = path.join(os.tmpdir(), 'gitcode-cli-');
  const tempRoot = await mkdtemp(prefix);
  const stagedDir = path.join(tempRoot, 'gitcode-cli');

  try {
    await cp(dir, stagedDir, { recursive: true, dereference: true });
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法准备 Gitcode CLI 临时目录: ${message}`);
  }

  return {
    path: stagedDir,
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true });
    },
  };
}

async function ensureContainerTargetDirectory({
  container,
  log,
  verbose,
  env,
}: StepOptions): Promise<void> {
  const targetDir = path.posix.dirname(CLI_INSTALL_PATH);
  const script = `set -e
target_dir=${JSON.stringify(targetDir)}
target_path=${JSON.stringify(CLI_INSTALL_PATH)}
if [ -e "$target_dir" ] && [ ! -d "$target_dir" ]; then
  echo "目标路径 '$target_dir' 已存在但不是目录" >&2
  exit 1
fi
mkdir -p "$target_dir"
if [ ! -w "$target_dir" ]; then
  echo "目标目录 '$target_dir' 无写权限" >&2
  exit 1
fi
if [ -e "$target_path" ] && [ ! -d "$target_path" ]; then
  echo "目标路径 '$target_path' 已存在但不是目录" >&2
  exit 1
fi
if [ -e "$target_path" ] && [ ! -w "$target_path" ]; then
  echo "目标路径 '$target_path' 无写权限" >&2
  exit 1
fi`;

  const result = await executeStep({
    container,
    name: 'gitcode-cli-target-check',
    script,
    log,
    verbose,
    env,
  });

  if (!result.success) {
    const output = result.output.trim();
    throw new Error(output || `无法验证 gitcode CLI 目标目录权限: ${CLI_INSTALL_PATH}`);
  }
}
