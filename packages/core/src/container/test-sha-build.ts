import type Docker from 'dockerode';

import { docker, logger } from './shared';
import {
  prepareImage,
  DockerUnavailableError,
  ImagePullError,
  type ImagePullStatus,
} from './prepare-image';
import {
  createWorkspaceContainer,
} from './create-workspace-container';
import {
  executeStep,
} from './execute-step';
import {
  collectDiagnostics,
  DiagnosticsCollectionError,
} from './collect-diagnostics';
import type { TestShaBuildOptions, TestShaBuildResult } from './types';

/**
 * Run a sequence of build verification steps inside a disposable container.
 *
 * Step order:
 * 1. `prepareImage` – ensure Docker is available and the Node image exists.
 * 2. `createWorkspaceContainer` – create a clean workspace container for the repo.
 * 3. `executeStep` – run clone/verify/checkout/project check/install scripts.
 * 4. `collectDiagnostics` – parse project files to determine pnpm usage.
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

  const env = [`REPO_URL=${repoUrl}`, `TARGET_SHA=${sha}`];
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

    const cloneResult = await executeStep({
      container,
      name: 'clone',
      script: 'rm -rf /tmp/workspace && git clone "$REPO_URL" /tmp/workspace 2>&1',
      log,
      verbose,
    });
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

    const verifyShaResult = await executeStep({
      container,
      name: 'verifySha',
      script:
        'cd /tmp/workspace && echo "=== 验证SHA存在性 ===" && echo "目标SHA: $TARGET_SHA" && git cat-file -e "$TARGET_SHA" 2>&1 && echo "SHA验证成功" || echo "SHA不存在"',
      log,
      verbose,
    });
    fullOutput += verifyShaResult.output;
    result.diagnostics.steps.verifySha = {
      success: verifyShaResult.success,
      duration: verifyShaResult.duration,
      error: verifyShaResult.success ? undefined : verifyShaResult.output,
    };
    if (!verifyShaResult.success) {
      const checkBranchResult = await executeStep({
        container,
        name: 'checkBranch',
        script:
          'cd /tmp/workspace && git show-ref --verify --quiet "refs/heads/$TARGET_SHA" 2>&1 && echo "是有效分支" || echo "不是有效分支"',
        log,
        verbose,
      });
      fullOutput += checkBranchResult.output;
      if (!checkBranchResult.success) {
        result.error = `SHA/分支验证失败: 提交 '$TARGET_SHA' 不存在`;
        result.exitCode = 1;
        return result;
      }
    }

    const checkoutResult = await executeStep({
      container,
      name: 'checkout',
      script: 'cd /tmp/workspace && git checkout "$TARGET_SHA" 2>&1',
      log,
      verbose,
    });
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

    const checkProjectResult = await executeStep({
      container,
      name: 'checkProject',
      script:
        'cd /tmp/workspace && echo "=== 检查项目文件 ===" && ls -la package.json 2>/dev/null && ls -la pnpm-lock.yaml 2>/dev/null && echo "=== 检查 package.json ===" && cat package.json | grep -E "packageManager|lockfileVersion" || echo "=== 文件检查完成 ==="',
      log,
      verbose,
    });
    fullOutput += checkProjectResult.output;
    result.diagnostics.steps.checkProject = {
      success: checkProjectResult.success,
      duration: checkProjectResult.duration,
      error: checkProjectResult.success ? undefined : '项目检查失败',
    };
    try {
      const diag = collectDiagnostics(checkProjectResult.output);
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

    const installResult = await executeStep({
      container,
      name: 'install',
      script:
        `cd /tmp/workspace && PNPM_VER=$(node -e "try{const s=require('./package.json').packageManager||''; if(String(s).includes('pnpm@')){process.stdout.write(String(s).split('pnpm@').pop());}else{process.stdout.write('latest')}}catch(e){process.stdout.write('latest')}") && corepack prepare pnpm@$PNPM_VER --activate && corepack pnpm --version && corepack pnpm install 2>&1`,
      log,
      verbose,
    });
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

