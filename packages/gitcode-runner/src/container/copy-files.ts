import { create as tarCreate } from 'tar';
import type Docker from 'dockerode';
import path from 'node:path';
import { stat } from 'node:fs/promises';

export interface CopyToContainerOptions {
  /** Docker container to copy files into. */
  container: Docker.Container;
  /** Local file or directory to copy. */
  srcPath: string;
  /** Target path inside the container. */
  containerPath: string;
  /** Follow symbolic links when packing the source. Defaults to false. */
  followSymlinks?: boolean;
}

export class CopyToContainerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CopyToContainerError';
  }
}

export async function copyToContainer({
  container,
  srcPath,
  containerPath,
  followSymlinks = false,
}: CopyToContainerOptions): Promise<string> {
  if (!container) {
    throw new CopyToContainerError('container is required');
  }
  if (!srcPath) {
    throw new CopyToContainerError('srcPath is required');
  }
  if (!containerPath) {
    throw new CopyToContainerError('containerPath is required');
  }

  const resolvedSource = path.resolve(srcPath);
  try {
    await stat(resolvedSource);
  } catch (error) {
    throw new CopyToContainerError(`Source path does not exist: ${resolvedSource}`, {
      cause: error,
    });
  }
  const sourceBase = path.basename(resolvedSource);

  const normalizedTarget = normalizeContainerTarget(containerPath);
  const explicitDirectory = isExplicitDirectory(containerPath);
  const shouldCheckDirectory = !explicitDirectory && normalizedTarget !== '/';
  const targetIsDirectory =
    explicitDirectory ||
    normalizedTarget === '/' ||
    (shouldCheckDirectory && (await pathExistsAsDirectory(container, normalizedTarget)));

  const { extractTo, finalPath, renameFrom } = resolveContainerPaths({
    normalizedTarget,
    sourceBase,
    treatAsDirectory: targetIsDirectory,
  });

  await ensureContainerDirectory(container, extractTo);

  const tarStream = tarCreate(
    {
      cwd: path.dirname(resolvedSource),
      follow: followSymlinks,
      portable: true,
      noMtime: true,
    },
    [sourceBase],
  ) as unknown as NodeJS.ReadableStream;

  try {
    await container.putArchive(tarStream, { path: extractTo });
  } catch (error) {
    throw new CopyToContainerError(
      `Failed to copy '${resolvedSource}' to '${finalPath}' inside container`,
      { cause: error },
    );
  }

  if (renameFrom !== finalPath) {
    await renameInContainer(container, renameFrom, finalPath);
  }

  return finalPath;
}

async function pathExistsAsDirectory(container: Docker.Container, target: string) {
  const { exitCode } = await runContainerCommand(container, ['test', '-d', target]);
  return exitCode === 0;
}

function normalizeContainerTarget(target: string) {
  let raw = target.replace(/\\/g, '/');
  if (!raw.startsWith('/')) {
    raw = `/${raw}`;
  }
  const normalized = path.posix.normalize(raw);
  if (!normalized.startsWith('/')) {
    throw new CopyToContainerError(`containerPath must be absolute: ${target}`);
  }
  return normalized;
}

function isExplicitDirectory(target: string) {
  return target.endsWith('/') && target !== '/';
}

function resolveContainerPaths({
  normalizedTarget,
  sourceBase,
  treatAsDirectory,
}: {
  normalizedTarget: string;
  sourceBase: string;
  treatAsDirectory: boolean;
}) {
  if (treatAsDirectory) {
    const dir = normalizedTarget === '/' ? '/' : normalizedTarget.replace(/\/+$/, '');
    const extractTo = dir === '' ? '/' : dir;
    const finalPath = path.posix.join(extractTo, sourceBase);
    return { extractTo, finalPath, renameFrom: finalPath };
  }

  const finalPath = normalizedTarget;
  const extractTo = path.posix.dirname(finalPath) || '/';
  const renameFrom = path.posix.join(extractTo, sourceBase);
  return { extractTo, finalPath, renameFrom };
}

async function ensureContainerDirectory(container: Docker.Container, dir: string) {
  const targetDir = dir === '' ? '/' : dir;
  const result = await runContainerCommand(container, ['mkdir', '-p', targetDir]);
  if (result.exitCode !== 0) {
    const text = result.output.trim() || `exit code ${result.exitCode}`;
    throw new CopyToContainerError(
      `Failed to create directory '${targetDir}' inside container: ${text}`,
    );
  }
}

async function renameInContainer(container: Docker.Container, from: string, to: string) {
  if (from === to) return;
  const result = await runContainerCommand(container, ['mv', '-f', from, to]);
  if (result.exitCode !== 0) {
    const text = result.output.trim() || `exit code ${result.exitCode}`;
    throw new CopyToContainerError(`Failed to move '${from}' to '${to}' inside container: ${text}`);
  }
}

async function runContainerCommand(container: Docker.Container, cmd: string[]) {
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  let output = '';
  stream.on('data', (data: Buffer) => {
    output += data.toString();
  });
  return await new Promise<{ exitCode: number; output: string }>((resolve, reject) => {
    stream.on('end', async () => {
      try {
        const info = await exec.inspect();
        resolve({ exitCode: info.ExitCode ?? 0, output });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    stream.on('error', (err) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}
