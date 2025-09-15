export interface ProjectDiagnostics {
  packageJsonExists: boolean;
  pnpmLockExists: boolean;
  isPnpmProject: boolean;
}

export class DiagnosticsCollectionError extends Error {}

export function collectDiagnostics(output: string): ProjectDiagnostics {
  if (!output) {
    throw new DiagnosticsCollectionError('无输出可供分析');
  }
  const packageJsonExists = output.includes('package.json');
  const pnpmLockExists = output.includes('pnpm-lock.yaml');
  const isPnpmByPackageManager =
    output.includes('"packageManager"') && output.includes('pnpm@');
  const isPnpmByLockFile = pnpmLockExists;
  return {
    packageJsonExists,
    pnpmLockExists,
    isPnpmProject: isPnpmByPackageManager || isPnpmByLockFile,
  };
}

