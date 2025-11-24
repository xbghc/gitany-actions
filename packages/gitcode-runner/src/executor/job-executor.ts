import type { RunnerJob, WorkflowConfig } from '@xbghc/gitcode-actions';
import { RunnerClient } from '../runner-client.js';
import { docker } from '../container/shared.js';
import { createRawContainer, removeContainer, exec } from '../container/index.js';
import { prepareImage } from '../container/prepare-image.js';
import { buildInitCommand } from '../utils/commands.js';

export class JobExecutor {
  constructor(private client: RunnerClient) {}

  async execute(job: RunnerJob) {
    console.log(`Executing job ${job.id} (${job.type})`);
    if (job.type === 'workflow') {
      await this.executeWorkflow(job);
    } else {
      console.warn('Unknown job type:', job.type);
    }
  }

  private async executeWorkflow(job: RunnerJob) {
    const { workflowId, repoUrl, branch, config, gitcodeToken } = job.payload;
    const {
      steps: configSteps,
      env: globalEnv,
      timeout: globalTimeout,
      baseImage,
      beforeAll,
      afterAll,
    } = config as WorkflowConfig;

    await this.client.updateJob(job.id, { status: 'running' });

    // Helper to stream logs
    const streamLogs = (logs: string) => {
      // Fire and forget, or wait? Waiting might slow down execution if network is slow.
      // But fire and forget might cause out-of-order logs if connection is flaky.
      // Ideally we should have a log queue.
      // For now, fire and forget.
      this.client.updateJob(job.id, { logs }).catch(console.error);
    };

    const containerName = `runner-${job.id}`;
    let container;

    try {
      // === Step 1: Initialize ===
      await this.client.updateJob(job.id, {
        stepName: 'fetch-pr',
        status: 'running',
        logs: 'Initializing runner...\n',
      });

      const image = baseImage || 'node:22';
      await this.client.updateJob(job.id, { logs: `Checking image ${image}...\n` });

      try {
        await prepareImage({ docker, image });
      } catch (e) {
        throw new Error(`Failed to pull image ${image}: ${e}`);
      }

      await this.client.updateJob(job.id, { logs: `Creating container...\n` });

      const containerEnv: Record<string, string> = { GITCODE_TOKEN: gitcodeToken || '' };
      if (globalEnv) {
        Object.assign(containerEnv, globalEnv);
      }

      const envList = Object.entries(containerEnv).map(([k, v]) => `${k}=${v}`);

      container = await createRawContainer({
        image,
        env: envList,
      });

      await this.client.updateJob(job.id, {
        stepName: 'fetch-pr',
        status: 'success',
        logs: 'Container ready.\n',
      });

      // === Step 2: BeforeAll ===
      await this.client.updateJob(job.id, { stepName: 'beforeAll', status: 'running' });

      const beforeAllCommand = beforeAll || buildInitCommand(repoUrl, branch);

      const beforeAllResult = await exec(container, beforeAllCommand, {
        timeout: globalTimeout,
        onOutput: streamLogs,
      });

      if (beforeAllResult.exitCode !== 0) {
        throw new Error(`beforeAll failed with exit code ${beforeAllResult.exitCode}`);
      }

      await this.client.updateJob(job.id, { stepName: 'beforeAll', status: 'success' });

      // === Step 3: Steps ===
      for (const step of configSteps) {
        await this.client.updateJob(job.id, { stepName: step.name, status: 'running' });

        const stepEnv = { ...containerEnv, ...step.env };

        const cmd = step.commands.join(' && ');

        const result = await exec(container, cmd, {
          workDir: '/workspace', // Assuming beforeAll setup /workspace
          env: stepEnv,
          timeout: step.timeout || globalTimeout,
          onOutput: streamLogs,
        });

        if (result.exitCode !== 0 && !step.continueOnError) {
          await this.client.updateJob(job.id, { stepName: step.name, status: 'failed' });
          throw new Error(`Step ${step.name} failed with exit code ${result.exitCode}`);
        }

        await this.client.updateJob(job.id, { stepName: step.name, status: 'success' });
      }

      // === Step 4: AfterAll ===
      if (afterAll) {
        await this.client.updateJob(job.id, { stepName: 'afterAll', status: 'running' });
        const result = await exec(container, afterAll, {
          workDir: '/workspace',
          timeout: globalTimeout,
          onOutput: streamLogs,
        });

        if (result.exitCode !== 0) {
          throw new Error(`afterAll failed with exit code ${result.exitCode}`);
        }
        await this.client.updateJob(job.id, { stepName: 'afterAll', status: 'success' });
      }

      await this.client.updateJob(job.id, { status: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.client.updateJob(job.id, { status: 'failed', error: msg });
    } finally {
      if (container) {
        try {
          await removeContainer(container.id);
        } catch {}
      }
    }
  }
}
