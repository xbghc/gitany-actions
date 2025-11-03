import readline from 'node:readline';
import type { ContainerInfo } from 'dockerode';

import { docker } from './shared.js';

async function promptAndRemoveRunningContainers(runningContainers: ContainerInfo[]) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Found running PR containers:');
  for (const info of runningContainers) {
    console.log(`  - ${info.Names[0]} (ID: ${info.Id}, PR: ${info.Labels['gitcode.prId']})`);
  }

  const answer = await new Promise<string>((resolve) => {
    rl.question('Do you want to remove them? (y/N) ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (answer.toLowerCase() !== 'y') {
    return;
  }

  for (const info of runningContainers) {
    const container = docker.getContainer(info.Id);
    try {
      await container.remove({ force: true });
    } catch (err) {
      console.error(`Failed to remove container ${info.Id}:`, err);
    }
  }
}

/**
 * Scan and remove stale PR containers.
 * Containers are identified by the `gitcode.prId` label.
 * Stoped containers will be removed automatically.
 * For running containers, the user will be prompted for confirmation.
 */
export async function cleanupPrContainers() {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: ['gitcode.prId'] },
  });

  const runningContainers: ContainerInfo[] = [];
  const stoppedContainers: ContainerInfo[] = [];

  for (const info of containers) {
    if (info.State === 'running') {
      runningContainers.push(info);
    } else {
      stoppedContainers.push(info);
    }
  }

  for (const info of stoppedContainers) {
    const container = docker.getContainer(info.Id);
    try {
      await container.remove({ force: true });
    } catch (err) {
      console.error(`Failed to remove container ${info.Id}:`, err);
    }
  }

  if (runningContainers.length > 0) {
    await promptAndRemoveRunningContainers(runningContainers);
  }
}
