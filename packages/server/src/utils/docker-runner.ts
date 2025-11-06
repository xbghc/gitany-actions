import { spawn } from 'child_process';

/**
 * Docker执行选项
 */
export interface DockerRunOptions {
  /** Docker镜像 */
  image: string;
  /** 要执行的命令 */
  command: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 超时时间（毫秒），默认30分钟 */
  timeout?: number;
  /** 输出回调函数 */
  onOutput?: (data: string, isError: boolean) => void;
  /** 步骤变化回调 */
  onStep?: (step: string) => void;
}

/**
 * Docker执行结果
 */
export interface DockerRunResult {
  /** 是否成功 */
  success: boolean;
  /** 退出码 */
  exitCode: number | null;
  /** 标准输出 */
  stdout: string;
  /** 错误输出 */
  stderr: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 在Docker容器中执行命令
 * @param options 执行选项
 * @returns 执行结果
 */
export async function runInDocker(options: DockerRunOptions): Promise<DockerRunResult> {
  const {
    image,
    command,
    env = {},
    timeout = 30 * 60 * 1000, // 默认30分钟
    onOutput,
  } = options;

  return new Promise((resolve) => {
    const dockerArgs = ['run', '--rm'];

    // 添加环境变量
    for (const [key, value] of Object.entries(env)) {
      dockerArgs.push('-e', `${key}=${value}`);
    }

    // 添加镜像和命令
    dockerArgs.push(image, 'sh', '-c', command);

    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    // 启动docker进程
    const dockerProcess = spawn('docker', dockerArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // 设置超时
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      dockerProcess.kill('SIGTERM');
      // 如果5秒后还没退出，强制kill
      setTimeout(() => {
        if (!dockerProcess.killed) {
          dockerProcess.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    // 监听标准输出
    if (dockerProcess.stdout) {
      dockerProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        if (onOutput) {
          onOutput(text, false);
        }
      });
    }

    // 监听错误输出
    if (dockerProcess.stderr) {
      dockerProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        if (onOutput) {
          onOutput(text, true);
        }
      });
    }

    // 监听进程退出
    dockerProcess.on('close', (exitCode) => {
      clearTimeout(timeoutId);

      if (isTimedOut) {
        resolve({
          success: false,
          exitCode: null,
          stdout,
          stderr,
          error: `Execution timed out after ${timeout}ms`,
        });
        return;
      }

      // 识别特殊错误类型
      let errorMessage: string | undefined;
      if (exitCode !== 0) {
        // 检测镜像拉取失败
        const isImagePullError =
          stderr.includes('manifest') ||
          stderr.includes('registry') ||
          stderr.includes('docker.io') ||
          stderr.includes('pull access denied') ||
          (exitCode === 125 && stderr.includes('Error response from daemon'));

        if (isImagePullError) {
          errorMessage =
            'Docker 镜像拉取失败。\n\n' +
            '可能原因：\n' +
            '1. 网络连接问题（中国大陆用户建议配置镜像加速）\n' +
            '2. 镜像不存在或拼写错误\n' +
            '3. 需要配置代理访问 Docker Hub\n\n' +
            '建议操作：\n' +
            '- 预先拉取镜像: docker pull ' +
            image +
            '\n' +
            '- 配置镜像加速器（阿里云、腾讯云、网易等）\n' +
            '- 检查网络连接和代理设置\n\n' +
            '原始错误: ' +
            stderr.trim();
        } else {
          errorMessage = `Process exited with code ${exitCode}`;
          if (stderr) {
            errorMessage += `\n\n${stderr.trim()}`;
          }
        }
      }

      resolve({
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        error: errorMessage,
      });
    });

    // 监听错误
    dockerProcess.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timeoutId);

      // 特殊处理 ENOENT 错误（docker命令不存在）
      let errorMessage = error.message;
      if (error.code === 'ENOENT') {
        errorMessage =
          'Docker 命令不可用。请确保：\n' +
          '1. Docker 已安装\n' +
          '2. Docker Desktop 已启动（Windows/Mac用户）\n' +
          '3. Docker 服务正在运行（Linux用户: sudo systemctl start docker）\n' +
          '4. 当前用户有权限执行 Docker 命令';
      }

      resolve({
        success: false,
        exitCode: null,
        stdout,
        stderr,
        error: errorMessage,
      });
    });
  });
}

/**
 * 检查 Docker 是否可用
 * @returns Docker 是否可用
 */
export async function checkDockerAvailable(): Promise<{ available: boolean; error?: string }> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errorOutput = '';

    // stdout 不需要收集，只需要检查退出码

    if (dockerProcess.stderr) {
      dockerProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
    }

    dockerProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ available: true });
      } else {
        resolve({
          available: false,
          error: `Docker 命令执行失败 (exit code ${exitCode}): ${errorOutput}`,
        });
      }
    });

    dockerProcess.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        resolve({
          available: false,
          error: 'Docker 命令不可用。请确保 Docker 已安装并启动。',
        });
      } else {
        resolve({
          available: false,
          error: `Docker 检查失败: ${error.message}`,
        });
      }
    });

    // 设置超时（5秒）
    setTimeout(() => {
      dockerProcess.kill();
      resolve({
        available: false,
        error: 'Docker 检查超时，可能 Docker 服务未响应',
      });
    }, 5000);
  });
}

/**
 * 检查 Docker 镜像是否已存在
 * @param image Docker 镜像名称（如 node:22-alpine）
 * @returns 镜像是否存在
 */
export async function checkImageExists(image: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['image', 'inspect', image], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    dockerProcess.on('close', (exitCode) => {
      // exitCode 0 表示镜像存在，非 0 表示不存在
      resolve(exitCode === 0);
    });

    dockerProcess.on('error', () => {
      // 出错视为不存在
      resolve(false);
    });

    // 超时（3秒）
    setTimeout(() => {
      dockerProcess.kill();
      resolve(false);
    }, 3000);
  });
}

/**
 * 将镜像名称转换为使用镜像源的地址
 * @param image 原始镜像名 (如 node:22-alpine)
 * @param mirror 镜像源地址 (如 hub-mirror.c.163.com)
 * @returns 转换后的镜像地址
 */
function transformImageWithMirror(image: string, mirror: string): string {
  // 检查是否包含 registry 地址
  const hasRegistry = image.includes('/') && !image.startsWith('library/');

  if (!hasRegistry && !image.includes('/')) {
    // 官方镜像（如 node:22-alpine），添加 library/ 前缀
    return `${mirror}/library/${image}`;
  } else if (image.startsWith('library/')) {
    // 已经有 library/ 前缀
    return `${mirror}/${image}`;
  } else {
    // 非官方镜像（如 bitnami/nginx）
    return `${mirror}/${image}`;
  }
}

/**
 * 拉取 Docker 镜像
 * @param image Docker 镜像名称
 * @param registryMirror 镜像源地址（可选）
 * @param onOutput 输出回调
 * @returns 拉取结果
 */
export async function pullDockerImage(
  image: string,
  registryMirror?: string,
  onOutput?: (text: string) => void,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // 确定要拉取的镜像地址
    const pullImage = registryMirror ? transformImageWithMirror(image, registryMirror) : image;
    const useMirror = pullImage !== image;

    if (onOutput) {
      if (useMirror) {
        onOutput(`正在使用镜像源 ${registryMirror} 拉取镜像...\n`);
      } else {
        onOutput(`正在拉取镜像 ${image}...\n`);
      }
      onOutput('这可能需要几分钟，取决于网络速度和镜像大小。\n\n');
    }

    // 步骤1: 拉取镜像
    const dockerProcess = spawn('docker', ['pull', pullImage], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    if (dockerProcess.stdout) {
      dockerProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        if (onOutput) {
          onOutput(text);
        }
      });
    }

    if (dockerProcess.stderr) {
      dockerProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        if (onOutput) {
          onOutput(text);
        }
      });
    }

    const handleClose = async (exitCode: number | null) => {
      if (exitCode === 0) {
        // 拉取成功
        if (onOutput) {
          onOutput(`\n✓ 镜像拉取成功\n`);
        }

        // 步骤2: 如果使用了镜像源，需要重新标记为原始名称
        if (useMirror) {
          if (onOutput) {
            onOutput(`正在重新标记为 ${image}...\n`);
          }

          try {
            // Tag 为原始名称
            await executeDockerCommand(['tag', pullImage, image]);

            // 删除镜像源的标签（节省空间）
            await executeDockerCommand(['rmi', pullImage]);

            if (onOutput) {
              onOutput(`✓ 镜像准备完成\n\n`);
            }
            resolve({ success: true });
          } catch (error) {
            const errorMsg = `镜像重新标记失败: ${error instanceof Error ? error.message : 'Unknown error'}`;
            if (onOutput) {
              onOutput(`⚠️  ${errorMsg}\n`);
              onOutput(`镜像已拉取但使用名称为: ${pullImage}\n\n`);
            }
            // 即使 tag 失败，镜像也已经拉取，可以考虑继续
            resolve({ success: true });
          }
        } else {
          if (onOutput) {
            onOutput('\n');
          }
          resolve({ success: true });
        }
      } else {
        // 拉取失败
        const errorMsg =
          '镜像拉取失败。\n\n' +
          '可能原因：\n' +
          '1. ⚠️  镜像源白名单限制（2025年大部分国内镜像源只支持部分镜像）\n' +
          '2. 网络连接问题\n' +
          '3. 镜像不存在或拼写错误\n\n' +
          '建议操作：\n' +
          '- 🔍 使用"测试镜像源"功能，测试当前选择的镜像是否被支持\n' +
          '- 🔄 尝试切换到其他镜像源（DaoCloud、1Panel、1ms等）\n' +
          '- 📦 如果都失败，可尝试使用Docker Hub直连（较慢但无限制）\n' +
          '- 💡 或选择更通用的镜像（如alpine、node等官方镜像）\n\n' +
          '原始错误:\n' +
          stderr.trim();

        resolve({ success: false, error: errorMsg });
      }
    };

    dockerProcess.on('close', (exitCode) => {
      handleClose(exitCode).catch((error) => {
        resolve({
          success: false,
          error: `处理镜像失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      });
    });

    dockerProcess.on('error', (error) => {
      resolve({
        success: false,
        error: `无法执行 docker pull 命令: ${error.message}`,
      });
    });

    // 超时（10分钟）
    setTimeout(
      () => {
        dockerProcess.kill();
        resolve({
          success: false,
          error: '镜像拉取超时（10分钟）。可能网络过慢或镜像过大。',
        });
      },
      10 * 60 * 1000,
    );
  });
}

/**
 * 执行 Docker 命令的辅助函数
 * @param args docker 命令参数
 * @returns Promise
 */
function executeDockerCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    if (process.stderr) {
      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    process.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${exitCode}: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });

    // 超时（30秒）
    setTimeout(() => {
      process.kill();
      reject(new Error('Command timeout'));
    }, 30000);
  });
}

/**
 * 构建在Docker容器中执行PR测试的命令
 * @param repoUrl 仓库URL
 * @param branch PR分支名
 * @param packageManager 包管理器
 * @param buildCommand build命令
 * @param lintCommand lint命令
 * @returns shell命令字符串
 */
export function buildPrTestCommand(
  repoUrl: string,
  branch: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm',
  buildCommand?: string,
  lintCommand?: string,
): string {
  const commands: string[] = [];

  // 如果使用pnpm，需要安装
  if (packageManager === 'pnpm') {
    commands.push('npm install -g pnpm');
  }

  // 克隆仓库
  commands.push(`echo "=== Cloning repository ===" && git clone ${repoUrl} /workspace`);

  // 切换到工作目录
  commands.push('cd /workspace');

  // 切换分支
  commands.push(`echo "=== Checking out branch ${branch} ===" && git checkout ${branch}`);

  // 安装依赖
  commands.push(`echo "=== Installing dependencies ===" && ${packageManager} install`);

  // 执行build
  if (buildCommand) {
    commands.push(`echo "=== Running build ===" && ${buildCommand}`);
  } else {
    commands.push(`echo "=== Running build ===" && ${packageManager} run build`);
  }

  // 执行lint
  if (lintCommand) {
    commands.push(`echo "=== Running lint ===" && ${lintCommand}`);
  } else {
    commands.push(`echo "=== Running lint ===" && ${packageManager} run lint`);
  }

  commands.push('echo "=== All tests completed successfully ==="');

  return commands.join(' && ');
}

/**
 * 生成初始化命令（克隆仓库、安装依赖）
 * @param repoUrl 仓库URL
 * @param branch 分支名
 * @param packageManager 包管理器
 * @returns 初始化命令字符串
 */
export function buildInitCommand(
  repoUrl: string,
  branch: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm',
): string {
  const commands: string[] = [];

  // 安装 pnpm（如果需要）
  if (packageManager === 'pnpm') {
    commands.push('npm install -g pnpm');
  }

  // 克隆仓库并直接切换到指定分支
  commands.push(
    `echo "=== Cloning repository and checking out branch ${branch} ===" && git clone --branch ${branch} ${repoUrl} /workspace`,
  );
  commands.push('cd /workspace');

  // 安装依赖
  commands.push(`echo "=== Installing dependencies ===" && ${packageManager} install`);
  commands.push('echo "=== Initialization completed ==="');

  return commands.join(' && ');
}

/**
 * 生成构建测试命令
 * @param packageManager 包管理器
 * @param buildCommand 自定义构建命令（可选）
 * @returns 构建命令字符串
 */
export function buildBuildCommand(
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm',
  buildCommand?: string,
): string {
  const commands: string[] = [];
  commands.push('cd /workspace');

  const cmd = buildCommand || `${packageManager} run build`;
  commands.push(`echo "=== Running build ===" && ${cmd}`);
  commands.push('echo "=== Build completed ==="');

  return commands.join(' && ');
}

/**
 * 生成 Lint 测试命令
 * @param packageManager 包管理器
 * @param lintCommand 自定义lint命令（可选）
 * @returns Lint命令字符串
 */
export function buildLintCommand(
  packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm',
  lintCommand?: string,
): string {
  const commands: string[] = [];
  commands.push('cd /workspace');

  const cmd = lintCommand || `${packageManager} run lint`;
  commands.push(`echo "=== Running lint ===" && ${cmd}`);
  commands.push('echo "=== Lint completed ==="');

  return commands.join(' && ');
}

/**
 * 测试Docker镜像源的可用性和速度
 * @param mirror 镜像源地址（可选，不传则测试Docker Hub）
 * @param mirrorName 镜像源名称（用于显示）
 * @param testImage 用于测试的镜像名称（可选，默认alpine:latest）
 * @returns 测试结果
 */
export async function testRegistryMirror(
  mirror?: string,
  mirrorName?: string,
  testImage?: string,
): Promise<{
  success: boolean;
  mirror: string;
  mirrorName: string;
  duration: number;
  speed?: number;
  error?: string;
}> {
  // 默认使用alpine:latest，但允许自定义
  const actualTestImage = testImage || 'alpine:latest';

  // 根据镜像估算大小（用于计算速度，单位：MB）
  const imageSizeMap: Record<string, number> = {
    'alpine:latest': 7.73,
    'node:22': 1100,
    'node:20': 1050,
    'node:18': 950,
  };

  // 获取镜像大小，如果未知则估算为50MB
  const imageSize = imageSizeMap[actualTestImage] || 50;

  const actualMirror = mirror || '';
  const actualMirrorName = mirrorName || 'Docker Hub';

  try {
    // 步骤1: 先删除本地的测试镜像（如果存在）
    await executeDockerCommand(['rmi', '-f', actualTestImage]).catch(() => {
      // 忽略删除失败（镜像可能不存在）
    });

    // 步骤2: 记录开始时间并拉取镜像
    const startTime = Date.now();

    const pullResult = await pullDockerImage(
      actualTestImage,
      actualMirror || undefined,
      undefined, // 不需要输出回调
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!pullResult.success) {
      return {
        success: false,
        mirror: actualMirror,
        mirrorName: actualMirrorName,
        duration,
        error: pullResult.error || '镜像拉取失败（可能是白名单限制）',
      };
    }

    // 步骤3: 计算下载速度（MB/s）
    const speed = imageSize / (duration / 1000);

    // 步骤4: 清理测试镜像
    await executeDockerCommand(['rmi', '-f', actualTestImage]).catch(() => {
      // 忽略清理失败
    });

    return {
      success: true,
      mirror: actualMirror,
      mirrorName: actualMirrorName,
      duration,
      speed,
    };
  } catch (error) {
    return {
      success: false,
      mirror: actualMirror,
      mirrorName: actualMirrorName,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 创建并启动一个持久的Docker容器
 * @param containerName 容器名称
 * @param image Docker镜像
 * @param env 环境变量
 * @returns 创建结果
 */
export async function createAndStartContainer(
  containerName: string,
  image: string,
  env?: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const dockerArgs = ['run', '-d', '--name', containerName];

    // 添加环境变量
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        dockerArgs.push('-e', `${key}=${value}`);
      }
    }

    // 使用 sleep infinity 保持容器运行
    dockerArgs.push(image, 'sleep', 'infinity');

    let stderr = '';

    const dockerProcess = spawn('docker', dockerArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (dockerProcess.stderr) {
      dockerProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    dockerProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `Failed to create container: ${stderr.trim()}`,
        });
      }
    });

    dockerProcess.on('error', (error: NodeJS.ErrnoException) => {
      let errorMessage = error.message;
      if (error.code === 'ENOENT') {
        errorMessage = 'Docker 命令不可用';
      }
      resolve({
        success: false,
        error: errorMessage,
      });
    });

    // 超时（30秒）
    setTimeout(() => {
      dockerProcess.kill();
      resolve({
        success: false,
        error: 'Container creation timeout',
      });
    }, 30000);
  });
}

/**
 * 在运行中的容器内执行命令
 * @param containerName 容器名称
 * @param command 要执行的命令
 * @param timeout 超时时间（毫秒），默认30分钟
 * @param onOutput 输出回调函数
 * @returns 执行结果
 */
export async function execInContainer(
  containerName: string,
  command: string,
  timeout = 30 * 60 * 1000,
  onOutput?: (data: string, isError: boolean) => void,
): Promise<DockerRunResult> {
  return new Promise((resolve) => {
    // docker exec <container> sh -c "<command>"
    const dockerArgs = ['exec', containerName, 'sh', '-c', command];

    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    const dockerProcess = spawn('docker', dockerArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // 设置超时
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      dockerProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!dockerProcess.killed) {
          dockerProcess.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    // 监听标准输出
    if (dockerProcess.stdout) {
      dockerProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        if (onOutput) {
          onOutput(text, false);
        }
      });
    }

    // 监听错误输出
    if (dockerProcess.stderr) {
      dockerProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        if (onOutput) {
          onOutput(text, true);
        }
      });
    }

    // 监听进程退出
    dockerProcess.on('close', (exitCode) => {
      clearTimeout(timeoutId);

      if (isTimedOut) {
        resolve({
          success: false,
          exitCode: null,
          stdout,
          stderr,
          error: `Execution timed out after ${timeout}ms`,
        });
        return;
      }

      let errorMessage: string | undefined;
      if (exitCode !== 0) {
        errorMessage = `Process exited with code ${exitCode}`;
        if (stderr) {
          errorMessage += `\n\n${stderr.trim()}`;
        }
      }

      resolve({
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        error: errorMessage,
      });
    });

    // 监听错误
    dockerProcess.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timeoutId);

      let errorMessage = error.message;
      if (error.code === 'ENOENT') {
        errorMessage = 'Docker 命令不可用';
      }

      resolve({
        success: false,
        exitCode: null,
        stdout,
        stderr,
        error: errorMessage,
      });
    });
  });
}

/**
 * 删除Docker容器
 * @param containerName 容器名称
 * @returns 删除结果
 */
export async function removeContainer(
  containerName: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // 使用 -f 强制删除，即使容器正在运行
    const dockerArgs = ['rm', '-f', containerName];

    let stderr = '';

    const dockerProcess = spawn('docker', dockerArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (dockerProcess.stderr) {
      dockerProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    dockerProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ success: true });
      } else {
        // 容器不存在也视为成功（可能已经被删除了）
        if (stderr.includes('No such container')) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `Failed to remove container: ${stderr.trim()}`,
          });
        }
      }
    });

    dockerProcess.on('error', (error: NodeJS.ErrnoException) => {
      let errorMessage = error.message;
      if (error.code === 'ENOENT') {
        errorMessage = 'Docker 命令不可用';
      }
      resolve({
        success: false,
        error: errorMessage,
      });
    });

    // 超时（30秒）
    setTimeout(() => {
      dockerProcess.kill();
      resolve({
        success: false,
        error: 'Container removal timeout',
      });
    }, 30000);
  });
}
