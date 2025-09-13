import Docker from 'dockerode';
import type { PullRequest } from '@gitany/gitcode';
import { toGitUrl } from '@gitany/gitcode';
// No local filesystem/container image build needed; use official Node images.

const docker = new Docker();

/** Forwarded Claude related env vars */
const forward = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'API_TIMEOUT_MS',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
];


export interface ContainerOptions {
  /** Docker image to use. Defaults to `node:20`. */
  image?: string;
  /** Extra environment variables to provide to the container. */
  env?: Record<string, string>;
  /** Script executed inside the container when calling `runPrInContainer`. */
  script?: string;
  /** Whether the container should automatically remove itself when stopped. */
  autoRemove?: boolean;
}

const containers = new Map<number, { container: Docker.Container; options: ContainerOptions }>();
const outputs = new Map<number, string>();

async function ensureDocker() {
  try {
    await docker.ping();
  } catch {
    throw new Error('Docker daemon is not available. Ensure Docker is running.');
  }
}

async function ensureContainer(repoUrl: string, pr: PullRequest, options: ContainerOptions = {}) {
  await ensureDocker();
  let entry = containers.get(pr.id);
  if (entry) return entry;

  const env: string[] = [];
  for (const v of forward) {
    const value = process.env[v];
    if (value) env.push(`${v}=${value}`);
  }
  if (options.env) {
    for (const [k, v] of Object.entries(options.env)) env.push(`${k}=${v}`);
  }

  const baseRepoUrl = toGitUrl(repoUrl);
  const headRepoUrl = toGitUrl(pr.head.repo.html_url);

  env.push(
    `PR_BASE_REPO_URL=${baseRepoUrl}`,
    `PR_HEAD_REPO_URL=${headRepoUrl}`,
    `PR_BASE_SHA=${pr.base.sha}`,
    `PR_HEAD_SHA=${pr.head.sha}`,
    `PR_REPO_URL=${baseRepoUrl}`,
  );

  const container = await docker.createContainer({
    Image: options.image ?? 'node:20',
    Cmd: ['sh', '-lc', 'tail -f /dev/null'],
    Env: env,
    User: 'node',
    HostConfig: { AutoRemove: options.autoRemove ?? false },
  });
  await container.start();
  entry = { container, options };
  containers.set(pr.id, entry);
  return entry;
}

async function execInContainer(container: Docker.Container, script: string, prId: number) {
  const exec = await container.exec({
    Cmd: ['sh', '-lc', script],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  let output = '';
  stream.on('data', (d) => {
    const text = d.toString();
    output += text;
    process.stdout.write(d);
  });
  return new Promise<{ exitCode: number; output: string }>((resolve, reject) => {
    stream.on('end', async () => {
      const info = await exec.inspect();
      outputs.set(prId, output);
      if (info.ExitCode !== 0) {
        reject(new Error(`container exited with code ${info.ExitCode}`));
      } else {
        resolve({ exitCode: info.ExitCode ?? 0, output });
      }
    });
  });
}

function defaultScript() {
  return [
    'rm -rf /tmp/workspace',
    'git clone "$PR_BASE_REPO_URL" /tmp/workspace',
    'cd /tmp/workspace',
    'git remote add head "$PR_HEAD_REPO_URL"',
    'git fetch origin "$PR_BASE_SHA"',
    'git fetch head "$PR_HEAD_SHA"',
    'git checkout "$PR_HEAD_SHA"',
    // 使用 Corepack 准备并激活 pnpm 指定版本（无需全局 enable，避免权限问题）
    // 安装目标项目指定的 pnpm 版本；若未指定则安装最新版
    'PNPM_VER=$(node -e "try{const s=require(\'./package.json\').packageManager||\'\'; if(String(s).includes(\'pnpm@\')){process.stdout.write(String(s).split(\'pnpm@\').pop());}else{process.stdout.write(\'latest\')}}catch(e){process.stdout.write(\'latest\')}")',
    'corepack prepare pnpm@$PNPM_VER --activate',
    'corepack pnpm --version',
    'corepack pnpm install --frozen-lockfile --ignore-scripts',
    'pnpm build',
    'pnpm test',
  ].join(' && ');
}

export async function runPrInContainer(repoUrl: string, pr: PullRequest, options: ContainerOptions = {}) {
  const entry = await ensureContainer(repoUrl, pr, options);
  return await execInContainer(entry.container, options.script ?? defaultScript(), pr.id);
}

export async function resetPrContainer(repoUrl: string, pr: PullRequest, options: ContainerOptions = {}) {
  await removePrContainer(pr.id);
  await ensureContainer(repoUrl, pr, options);
}

export async function removePrContainer(prId: number) {
  const entry = containers.get(prId);
  if (!entry) return;
  try {
    await entry.container.stop({ t: 0 });
  } catch {
    /* ignore */
  }
  try {
    await entry.container.remove({ force: true });
  } catch {
    /* ignore */
  }
  containers.delete(prId);
  outputs.delete(prId);
}

export async function getPrContainerStatus(prId: number) {
  const entry = containers.get(prId);
  if (!entry) return null;
  const info = await entry.container.inspect();
  return info.State?.Status ?? null;
}

export function getPrContainerOutput(prId: number) {
  return outputs.get(prId) ?? null;
}

export interface TestShaBuildOptions {
  /** Node.js version for the test container. Defaults to `18`. */
  nodeVersion?: string;
  /** Enable verbose output for debugging. Defaults to `false`. */
  verbose?: boolean;
  /** Keep container after test for debugging. Defaults to `false`. */
  keepContainer?: boolean;
}

export interface TestShaBuildResult {
  /** 构建是否成功 */
  success: boolean;
  /** 容器退出码 */
  exitCode: number;
  /** 执行时间（毫秒） */
  duration: number;
  /** 错误信息（如果失败） */
  error?: string;
  /** 容器输出日志 */
  output?: string;
  /** 诊断信息 */
  diagnostics: {
    dockerAvailable: boolean;
    repoAccessible: boolean;
    isPnpmProject: boolean;
    packageJsonExists: boolean;
    pnpmLockExists: boolean;
    nodeVersion: string;
    imagePullStatus: 'unknown' | 'exists' | 'pulled' | 'failed';
    containerId?: string;
    steps: {
      clone: { success: boolean; duration: number; error?: string };
      verifySha: { success: boolean; duration: number; error?: string };
      checkout: { success: boolean; duration: number; error?: string };
      checkProject: { success: boolean; duration: number; error?: string };
      install: { success: boolean; duration: number; error?: string };
    };
  };
}

/**
 * Test whether a repository at a specific commit can install dependencies
 * successfully using pnpm.
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

  // 初始化结果对象
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

  try {
    // 检查 Docker 可用性
    await ensureDocker();
    result.diagnostics.dockerAvailable = true;

    if (verbose) {
      console.log(`🐳 Docker 可用，使用 Node.js ${nodeVersion}`);
    }

    // 创建单一容器执行所有步骤
    const env = [`REPO_URL=${repoUrl}`, `TARGET_SHA=${sha}`];
    let container: Docker.Container | undefined;
    let fullOutput = '';

    try {
      // 使用官方 Node 镜像，不再构建自定义镜像
      const imageName = `node:${nodeVersion}`;
      if (verbose) {
        console.log(`🐳 使用镜像: ${imageName}`);
      }

      // 若本地不存在镜像则拉取
      try {
        await docker.getImage(imageName).inspect();
        result.diagnostics.imagePullStatus = 'exists';
        if (verbose) console.log(`🐳 镜像 ${imageName} 已存在`);
      } catch {
        if (verbose) console.log(`🐳 拉取镜像 ${imageName}...`);
        await new Promise<void>((resolve, reject) => {
          docker.pull(imageName, (err: any, stream: any) => {
            if (err) return reject(err);
            if (!stream) return reject(new Error('Docker pull stream is undefined'));
            if (verbose) {
              stream.on('data', (d: Buffer) => {
                try { process.stdout.write(d.toString()); } catch { /* ignore */ }
              });
            }
            stream.on('end', () => resolve());
            stream.on('error', (e: any) => reject(e));
          });
        });
        result.diagnostics.imagePullStatus = 'pulled';
        if (verbose) console.log(`🐳 镜像 ${imageName} 拉取完成`);
      }

      container = await docker.createContainer({
        Image: imageName,
        Cmd: ['sh', '-lc', 'tail -f /dev/null'],
        Env: env,
        User: 'node',
        HostConfig: { AutoRemove: false },
      });

      result.diagnostics.containerId = container.id;
      await container.start();

      if (verbose) {
        console.log(`🐳 容器已创建，ID: ${container.id}`);
      }

      // 定义执行步骤的函数
      const executeStep = async (name: string, script: string) => {
        if (verbose) {
          console.log(`📋 执行步骤: ${name}`);
        }

        const stepStartTime = Date.now();

        try {
          if (!container) {
            throw new Error('容器未初始化');
          }
          const exec = await container.exec({
            Cmd: ['sh', '-lc', script],
            AttachStdout: true,
            AttachStderr: true,
          });

          const stream = await exec.start({ hijack: true, stdin: false });
          let stepOutput = '';

          stream.on('data', (data) => {
            const text = data.toString();
            stepOutput += text;
            fullOutput += text;

            if (verbose) {
              process.stdout.write(`[${name}] ${text}`);
            }
          });

          return new Promise<{ success: boolean; duration: number; output: string }>((resolve) => {
            stream.on('end', async () => {
              const info = await exec.inspect();
              const duration = Date.now() - stepStartTime;
              const success = info.ExitCode === 0;
              resolve({ success, duration, output: stepOutput });
            });
          });

        } catch (error) {
          const duration = Date.now() - stepStartTime;
          const errorMsg = `步骤 ${name} 执行异常: ${error instanceof Error ? error.message : String(error)}`;
          return { success: false, duration, output: errorMsg };
        }
      };

      // 步骤1: 克隆仓库
      const cloneResult = await executeStep('clone', 'rm -rf /tmp/workspace && git clone "$REPO_URL" /tmp/workspace 2>&1');
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

      // 步骤2: 验证SHA存在性
      const verifyShaResult = await executeStep('verifySha', `cd /tmp/workspace && echo "=== 验证SHA存在性 ===" && echo "目标SHA: $TARGET_SHA" && git cat-file -e "$TARGET_SHA" 2>&1 && echo "SHA验证成功" || echo "SHA不存在"`);

      result.diagnostics.steps.verifySha = {
        success: verifyShaResult.success,
        duration: verifyShaResult.duration,
        error: verifyShaResult.success ? undefined : verifyShaResult.output,
      };

      if (!verifyShaResult.success) {
        // 检查是否是分支名而不是SHA
        const checkBranchResult = await executeStep('checkBranch', `cd /tmp/workspace && git show-ref --verify --quiet "refs/heads/$TARGET_SHA" 2>&1 && echo "是有效分支" || echo "不是有效分支"`);

        if (!checkBranchResult.success) {
          result.error = `SHA/分支验证失败: 提交 '$TARGET_SHA' 不存在`;
          result.success = false;
          result.exitCode = 1;
          return result;
        }
        // 如果是分支名，继续执行checkout
      }

      // 步骤3: 切换到指定SHA
      const checkoutResult = await executeStep('checkout', 'cd /tmp/workspace && git checkout "$TARGET_SHA" 2>&1');
      result.diagnostics.steps.checkout = {
        success: checkoutResult.success,
        duration: checkoutResult.duration,
        error: checkoutResult.success ? undefined : checkoutResult.output,
      };

      if (!checkoutResult.success) {
        result.error = `步骤 checkout 失败: ${checkoutResult.output.trim()}`;
        return result;
      }

      // 步骤4: 检查项目类型和文件存在性
      const checkProjectResult = await executeStep('checkProject', 'cd /tmp/workspace && echo "=== 检查项目文件 ===" && ls -la package.json 2>/dev/null && ls -la pnpm-lock.yaml 2>/dev/null && echo "=== 检查 package.json ===" && cat package.json | grep -E "packageManager|lockfileVersion" || echo "=== 文件检查完成 ==="');

      // 解析检查结果
      const output = checkProjectResult.output;
      result.diagnostics.packageJsonExists = output.includes('package.json');
      result.diagnostics.pnpmLockExists = output.includes('pnpm-lock.yaml');

      // 判断是否为 pnpm 项目
      const isPnpmByPackageManager = output.includes('"packageManager"') && output.includes('pnpm@');
      const isPnpmByLockFile = result.diagnostics.pnpmLockExists;
      result.diagnostics.isPnpmProject = isPnpmByPackageManager || isPnpmByLockFile;

      result.diagnostics.steps.checkProject = {
        success: checkProjectResult.success,
        duration: checkProjectResult.duration,
        error: checkProjectResult.success ? undefined : '项目检查失败',
      };

      // 如果不是 pnpm 项目，直接返回失败
      if (!result.diagnostics.isPnpmProject) {
        const reason = result.diagnostics.packageJsonExists
          ? '项目不是 pnpm 项目 (未检测到 packageManager 或 pnpm-lock.yaml)'
          : '项目缺少 package.json 文件';
        result.error = `项目检查失败: ${reason}`;
        result.success = false;
        result.exitCode = 1;
        return result;
      }

      // 步骤5: 安装 pnpm（按项目声明版本；否则安装最新版）并执行安装
      const installResult = await executeStep(
        'install',
        `cd /tmp/workspace \
&& PNPM_VER=$(node -e "try{const s=require('./package.json').packageManager||''; if(String(s).includes('pnpm@')){process.stdout.write(String(s).split('pnpm@').pop());}else{process.stdout.write('latest')}}catch(e){process.stdout.write('latest')}") \
&& corepack prepare pnpm@$PNPM_VER --activate \
&& corepack pnpm --version \
&& corepack pnpm install 2>&1`
      );
      result.diagnostics.steps.install = {
        success: installResult.success,
        duration: installResult.duration,
        error: installResult.success ? undefined : installResult.output,
      };

      if (!installResult.success) {
        result.error = `步骤 install 失败: ${installResult.output.trim()}`;
        return result;
      }

      // 所有步骤成功
      result.success = true;
      result.exitCode = 0;
      result.output = fullOutput;
      // 保留 imagePullStatus 为 'exists' 或 'pulled'，不覆盖

    } catch (error) {
      // 如果在拉取镜像阶段失败，标记 pull 失败
      if (String(error).includes('pull') || String(error).includes('Pull')) {
        result.diagnostics.imagePullStatus = 'failed';
      }
      result.error = `容器执行异常: ${error instanceof Error ? error.message : String(error)}`;
      result.exitCode = 1;
    } finally {
      // 清理容器（如果不需要保留）
      if (!keepContainer && container) {
        try {
          await container.remove({ force: true });
        } catch {
          /* ignore */
        }
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.exitCode = 1;

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Docker daemon is not available')) {
      result.diagnostics.dockerAvailable = false;
    }
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}
