import type Docker from 'dockerode';

import { containers, logger, outputs } from './shared';

async function execInContainer(
  container: Docker.Container,
  script: string,
  prId: number,
) {
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
    try {
      logger.debug(text);
    } catch {
      /* ignore */
    }
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

export async function execInPrContainer(prId: number, script: string) {
  const entry = containers.get(prId);
  if (!entry) throw new Error('container not found');
  return await execInContainer(entry.container, script, prId);
}

