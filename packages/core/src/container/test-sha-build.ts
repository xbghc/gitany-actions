import type Docker from 'dockerode';

import { docker, logger } from './shared';
import {
  prepareImage,
  DockerUnavailableError,
  ImagePullError,
  type ImagePullStatus,
} from './prepare-image';
import { createWorkspaceContainer } from './create-workspace-container';
import { cloneRepo } from './clone-repo';
import { verifySha } from './verify-sha';
import { checkoutSha } from './checkout-sha';
import { checkProjectFiles } from './check-project-files';
import { installDependencies } from './install-dependencies';
import { DiagnosticsCollectionError } from './collect-diagnostics';
import type { TestShaBuildOptions, TestShaBuildResult } from './types';

/**
 * Run a sequence of build verification steps inside a disposable container.
 */
export async function testShaBuild(
  repoUrl: string,
  sha: string,
  options: TestShaBuildOptions = {},
): Promise<TestShaBuildResult> {
  const startTime = Date.now();
  const verbose = options.verbose ?? false;
  const keepContainer = options.keepContainer ?? false;
  const nodeVersion = options.nodeVersion ?? '18';
  const log = logger.child({ scope: 'core:container', func: 'testShaBuild', sha });
  if (verbose) {
    try {
      log.level = 'debug';
    } catch {
      /* ignore */
    }
  }

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
      verbose,
      log,
    });
    result.diagnostics.dockerAvailable = true;
    result.diagnostics.imagePullStatus = imageStatus;

    container = await createWorkspaceContainer({
      docker,
      image: imageName,
      env,
      log,
    });
    result.diagnostics.containerId = container.id;

    const cloneResult = await cloneRepo({ container, log, verbose });
    fullOutput += cloneResult.output;
    result.diagnostics.steps.clone = {
      success: cloneResult.success,
      duration: cloneResult.duration,
      error: cloneResult.success ? undefined : cloneResult.output,
    };
    result.diagnostics.repoAccessible = cloneResult.success;
    if (!cloneResult.success) {
      result.error = `步骤 clone 失败: ${cloneResult.output.trim()}`;
      return result;
    }

    const verifyResult = await verifySha({ container, log, verbose });
    fullOutput += verifyResult.output;
    result.diagnostics.steps.verifySha = {
      success: verifyResult.success,
      duration: verifyResult.duration,
      error: verifyResult.success ? undefined : verifyResult.output,
    };
    if (!verifyResult.success) {
      result.error = `SHA/分支验证失败: 提交 '$TARGET_SHA' 不存在`;
      result.exitCode = 1;
      return result;
    }

    const checkoutResult = await checkoutSha({ container, log, verbose });
    fullOutput += checkoutResult.output;
    result.diagnostics.steps.checkout = {
      success: checkoutResult.success,
      duration: checkoutResult.duration,
      error: checkoutResult.success ? undefined : checkoutResult.output,
    };
    if (!checkoutResult.success) {
      result.error = `步骤 checkout 失败: ${checkoutResult.output.trim()}`;
      return result;
    }

    try {
      const { step: projectStep, diagnostics: diag } = await checkProjectFiles({
        container,
        log,
        verbose,
      });
      fullOutput += projectStep.output;
      result.diagnostics.steps.checkProject = {
        success: projectStep.success,
        duration: projectStep.duration,
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

    const installResult = await installDependencies({ container, log, verbose, env: [`NPM_CONFIG_REGISTRY=${npmRegistry}`, `PNPM_CONFIG_REGISTRY=${pnpmRegistry}`] });
    fullOutput += installResult.output;
    result.diagnostics.steps.install = {
      success: installResult.success,
      duration: installResult.duration,
      error: installResult.success ? undefined : installResult.output,
    };
    if (!installResult.success) {
      result.error = `步骤 install 失败: ${installResult.output.trim()}`;
      return result;
    }

    result.success = true;
    result.exitCode = 0;
    result.output = fullOutput;
  } catch (error) {
    result.exitCode = 1;
    result.error = error instanceof Error ? error.message : String(error);
    if (error instanceof DockerUnavailableError) {
      result.diagnostics.dockerAvailable = false;
    }
    if (error instanceof ImagePullError) {
      result.diagnostics.imagePullStatus = 'failed';
    }
  } finally {
    result.duration = Date.now() - startTime;
    if (!keepContainer && container) {
      try {
        await container.remove({ force: true });
      } catch {
        /* ignore */
      }
    }
  }

  return result;
}
