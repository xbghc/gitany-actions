export interface ContainerOptions {
  /** Docker image to use. Defaults to `node:20`. */
  image?: string;
  /** Extra environment variables to provide to the container. */
  env?: Record<string, string>;
  /** Whether the container should automatically remove itself when stopped. */
  autoRemove?: boolean;
}

/**
 * 容器创建配置
 */
export interface CreateContainerConfig {
  /** Git 仓库 URL */
  repoUrl: string;

  /** 代码版本（三选一） */
  branch?: string;
  sha?: string;
  pr?: number;

  /** 容器配置 */
  image?: string;
  labels?: Record<string, string>;
  env?: Record<string, string>;

  /** 依赖安装配置 */
  install?:
    | boolean
    | {
        packageManager?: 'npm' | 'pnpm' | 'yarn' | 'auto';
        registry?: string;
      };
}

/**
 * 容器创建结果
 */
export interface CreateContainerResult {
  /** 容器唯一 ID */
  id: string;
  /** Docker 容器实例 */
  container: import('dockerode').Container;
}

/**
 * 容器详细信息
 */
export interface ContainerInfo {
  /** 容器唯一 ID */
  id: string;
  /** 容器名称 */
  name: string;
  /** 容器状态 */
  status: 'running' | 'stopped' | 'exited' | 'paused' | 'restarting' | 'dead';
  /** Docker 镜像 */
  image: string;
  /** 容器标签 */
  labels: Record<string, string>;
  /** 创建时间 */
  created: Date;
  /** 当前 Git 分支（如果是 Git 仓库容器） */
  currentBranch?: string;
  /** 当前 Git commit SHA */
  currentSha?: string;
}

export interface TestShaBuildOptions {
  /** Node.js version for the test container. Defaults to `18`. */
  nodeVersion?: string;
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
