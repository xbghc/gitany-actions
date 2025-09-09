export interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface GitExecOptions {
  cwd?: string;
}
