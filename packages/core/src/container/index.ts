import Docker from 'dockerode';
import type { PullRequest } from '@gitany/gitcode';
import { toGitUrl } from '@gitany/gitcode';

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
    'corepack enable',
    'rm -rf /tmp/workspace',
    'git clone "$PR_BASE_REPO_URL" /tmp/workspace',
    'cd /tmp/workspace',
    'git remote add head "$PR_HEAD_REPO_URL"',
    'git fetch origin "$PR_BASE_SHA"',
    'git fetch head "$PR_HEAD_SHA"',
    'git checkout "$PR_HEAD_SHA"',
    'pnpm install --frozen-lockfile --ignore-scripts',
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
export function getPrContainer(prId: number) {
  return containers.get(prId)?.container ?? null;
}
