import type Docker from 'dockerode';

import { checkProjectFiles } from '../executor/check-project-files.js';
import { DiagnosticsCollectionError } from '../executor/collect-diagnostics.js';
import {
  executor,
  StepExecutionError as ContainerStepExecutionError,
} from '../executor/container-executor.js';
import { createRawContainer } from '../container/lifecycle.js';
import { ImagePullError, prepareImage, type ImagePullStatus } from '../container/prepare-image.js';
import { docker } from '../container/shared.js';
import type { TestShaBuildOptions, TestShaBuildResult } from '../container/types.js';
import { verifySha } from '../executor/verify-sha.js';

/**
 * Run a sequence of build verification steps inside a disposable container.
 */
export async function testShaBuild(
  repoUrl: string,
  sha: string,
  options: TestShaBuildOptions = {},
): Promise<TestShaBuildResult> {
  const startTime = Date.now();
  const keepContainer = options.keepContainer ?? false;
  const nodeVersion = options.nodeVersion ?? '18';

  const result: TestShaBuildResult = {
    success: false,
    exitCode: -1,
    duration: 0,
    diagnostics: {
      dockerAvailable: false,
      repoAccessible: false,
      isPnpmProject: false,
      packageJsonExists: false,
      pnpmLockExists: false,
      nodeVersion,
      imagePullStatus: 'unknown',
      steps: {
        clone: { success: false, duration: 0 },
        verifySha: { success: false, duration: 0 },
        checkout: { success: false, duration: 0 },
        checkProject: { success: false, duration: 0 },
        install: { success: false, duration: 0 },
      },
    },
  };

  const defaultRegistry = 'https://registry.npmmirror.com';
  const npmRegistry = process.env.NPM_CONFIG_REGISTRY ?? defaultRegistry;
  const pnpmRegistry = process.env.PNPM_CONFIG_REGISTRY ?? defaultRegistry;
  const env = [
    `REPO_URL=${repoUrl}`,
    `TARGET_SHA=${sha}`,
    `NPM_CONFIG_REGISTRY=${npmRegistry}`,
    `PNPM_CONFIG_REGISTRY=${pnpmRegistry}`,
  ];
  const imageName = `node:${nodeVersion}`;
  let container: Docker.Container | undefined;
  let fullOutput = '';

  try {
    const imageStatus: ImagePullStatus = await prepareImage({
      docker,
      image: imageName,
    });
    result.diagnostics.dockerAvailable = true;
    result.diagnostics.imagePullStatus = imageStatus;

    container = await createRawContainer({
      image: imageName,
      env,
    });
    result.diagnostics.containerId = container.id;

    try {
      const cloneExecResult = await executor(container)
        .execute('rm -rf /tmp/workspace', { name: '清理工作空间' })
        .execute('git clone "$REPO_URL" /tmp/workspace 2>&1', { name: '克隆仓库' });

      const combinedOutput = cloneExecResult.steps.map((s) => s.output).join('\n');
      fullOutput += combinedOutput;
      result.diagnostics.steps.clone = {
        success: cloneExecResult.success,
        duration: 0,
        error: cloneExecResult.success ? undefined : combinedOutput,
      };
      result.diagnostics.repoAccessible = cloneExecResult.success;
    } catch (error) {
      if (error instanceof ContainerStepExecutionError) {
        result.diagnostics.steps.clone = {
          success: false,
          duration: 0,
          error: error.output,
        };
        result.diagnostics.repoAccessible = false;
        result.error = `步骤 ${error.stepName} 失败: ${error.output.trim()}`;
        return result;
      }
      throw error;
    }

    const verifyResult = await verifySha({ container });
    fullOutput += verifyResult.output;
    result.diagnostics.steps.verifySha = {
      success: verifyResult.success,
      duration: 0, // 时间统计已外部化
      error: verifyResult.success ? undefined : verifyResult.output,
    };
    if (!verifyResult.success) {
      result.error = `SHA/分支验证失败: 提交 '$TARGET_SHA' 不存在`;
      result.exitCode = 1;
      return result;
    }

    try {
      const checkoutExecResult = await executor(container).execute(
        'cd /tmp/workspace && git checkout "$TARGET_SHA" 2>&1',
        {
          name: 'Checkout SHA',
        },
      );

      const checkoutStep = checkoutExecResult.steps[0];
      fullOutput += checkoutStep.output;
      result.diagnostics.steps.checkout = {
        success: checkoutStep.success,
        duration: 0,
        error: checkoutStep.success ? undefined : checkoutStep.output,
      };
    } catch (error) {
      if (error instanceof ContainerStepExecutionError) {
        result.diagnostics.steps.checkout = {
          success: false,
          duration: 0,
          error: error.output,
        };
        result.error = `步骤 checkout 失败: ${error.output.trim()}`;
        return result;
      }
      throw error;
    }

    try {
      const { step: projectStep, diagnostics: diag } = await checkProjectFiles({
        container,
      });
      fullOutput += projectStep.output;
      result.diagnostics.steps.checkProject = {
        success: projectStep.success,
        duration: 0, // 时间统计已外部化
        error: projectStep.success ? undefined : '项目检查失败',
      };
      result.diagnostics.packageJsonExists = diag.packageJsonExists;
      result.diagnostics.pnpmLockExists = diag.pnpmLockExists;
      result.diagnostics.isPnpmProject = diag.isPnpmProject;
    } catch (e) {
      if (e instanceof DiagnosticsCollectionError) {
        result.error = `项目诊断失败: ${e.message}`;
        return result;
      }
      throw e;
    }
    if (!result.diagnostics.isPnpmProject) {
      const reason = result.diagnostics.packageJsonExists
        ? '项目不是 pnpm 项目 (未检测到 packageManager 或 pnpm-lock.yaml)'
        : '项目缺少 package.json 文件';
      result.error = `项目检查失败: ${reason}`;
      result.exitCode = 1;
      return result;
    }

    result.success = true;
    result.exitCode = 0;
    result.output = fullOutput;
  } catch (error) {
    result.exitCode = 1;
    result.error = error instanceof Error ? error.message : String(error);
    if (error instanceof ImagePullError) {
      result.diagnostics.imagePullStatus = 'failed';
    }
  } finally {
    result.duration = Date.now() - startTime;
    if (!keepContainer && container) {
      try {
        await container.remove({ force: true });
      } catch {
        // Container removal failed, but we don't need to log it
      }
    }
  }

  return result;
}
