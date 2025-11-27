import type Docker from 'dockerode';
import {
  executor,
  StepExecutionError as ContainerStepExecutionError,
} from './container-executor.js';

export interface InstallOptions {
  container: Docker.Container;
  env?: string[];
}

export interface InstallResult {
  success: boolean;
  output: string;
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

/**
 * 自动检测包管理器并安装依赖
 *
 * @internal 仅供内部使用
 *
 * TODO: 未来允许用户自定义 prepare 流程，此函数作为 fallback
 * - 允许用户提供自定义的容器准备流程
 * - 保留自动检测逻辑作为默认 fallback 行为
 * - 支持更灵活的依赖安装策略（缓存、增量安装等）
 *
 * @param options - 安装选项
 * @returns 安装结果
 */
export async function installDependencies({
  container,
  env,
}: InstallOptions): Promise<InstallResult> {
  let lastResult: InstallResult | undefined;
  let delay = INITIAL_DELAY_MS;

  const installScript = `
        set -e
        cd /tmp/workspace

        echo "Determining pnpm version from package.json..."
        PNPM_VER=$(node -e "try { const s = require('./package.json').packageManager || ''; if (String(s).includes('pnpm@')) { process.stdout.write(String(s).split('pnpm@').pop()); } else { process.stdout.write('latest'); } } catch(e) { process.stdout.write('latest'); }")
        echo "--> Using pnpm version: $PNPM_VER"

        echo "Activating pnpm version..."
        corepack prepare pnpm@$PNPM_VER --activate

        echo "Verifying pnpm version:"
        corepack pnpm --version

        echo "Installing dependencies..."
        corepack pnpm install 2>&1
      `.trim();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await executor(container, { env }).execute(installScript, {
        name: `install (attempt ${attempt}/${MAX_RETRIES})`,
      });

      if (result.success) {
        return {
          success: true,
          output: result.steps[0].output,
        };
      }

      lastResult = {
        success: false,
        output: result.steps[0].output,
      };
    } catch (error) {
      lastResult = {
        success: false,
        output: error instanceof ContainerStepExecutionError ? error.output : String(error),
      };
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  return lastResult!;
}
