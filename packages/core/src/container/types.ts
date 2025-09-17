export interface ContainerOptions {
  /** Docker image to use. Defaults to `node:20`. */
  image?: string;
  /** Extra environment variables to provide to the container. */
  env?: Record<string, string>;
  /** Whether the container should automatically remove itself when stopped. */
  autoRemove?: boolean;
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
