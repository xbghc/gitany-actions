export function buildInitCommand(repoUrl: string, branch: string): string {
  const commands: string[] = [];
  // 克隆仓库并直接切换到指定分支
  commands.push(
    `echo "=== Cloning repository and checking out branch ${branch} ===" && git clone --branch ${branch} ${repoUrl} /workspace`,
  );
  commands.push('cd /workspace');
  commands.push('echo "=== Initialization completed ==="');

  return commands.join(' && ');
}
