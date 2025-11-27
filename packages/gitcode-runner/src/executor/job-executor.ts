import type { RunnerJob, WorkflowConfig, WorkflowJob } from '@xbghc/gitcode-actions';
import type Docker from 'dockerode';
import { RunnerClient } from '../runner-client.js';
import { docker } from '../container/shared.js';
import { createRawContainer, removeContainer, exec } from '../container/index.js';
import { prepareImage } from '../container/prepare-image.js';
import { buildInitCommand } from '../utils/commands.js';

/**
 * Executor responsible for running jobs (workflows) on the runner.
 */
export class JobExecutor {
  /**
   * Creates a new JobExecutor instance.
   * @param client - The runner client used to communicate with the server.
   */
  constructor(private client: RunnerClient) {}

  /**
   * Executes a job based on its type.
   * @param job - The job to execute.
   */
  async execute(job: RunnerJob) {
    console.log(`Executing job ${job.id} (${job.type})`);
    if (job.type === 'workflow') {
      await this.executeWorkflow(job);
    } else {
      console.warn('Unknown job type:', job.type);
    }
  }

  /**
   * Executes a workflow job.
   * @param job - The workflow job to execute.
   */
  private async executeWorkflow(job: WorkflowJob) {
    const { repoUrl, branch, config, gitcodeToken } = job.payload;
    const {
      steps: configSteps,
      env: globalEnv,
      timeout: globalTimeout,
      baseImage,
      beforeAll,
      afterAll,
    } = config as WorkflowConfig;

    await this.client.updateJob(job.id, { status: 'running' });

    let container: Docker.Container | undefined;

    try {
      // Prepare environment variables
      const containerEnv: Record<string, string> = { GITCODE_TOKEN: gitcodeToken || '' };
      if (globalEnv) {
        Object.assign(containerEnv, globalEnv);
      }

      // 1. Prepare Container
      container = await this.prepareContainer(job.id, baseImage, containerEnv);

      // 2. BeforeAll
      const beforeAllCommand = beforeAll || buildInitCommand(repoUrl, branch);
      await this.executeStepCommand(container, job.id, 'beforeAll', beforeAllCommand, {
        timeout: globalTimeout,
      });

      // 3. User Steps
      for (const step of configSteps) {
        const stepEnv = { ...containerEnv, ...step.env };
        const cmd = step.commands.join(' && ');

        await this.executeStepCommand(container, job.id, step.name, cmd, {
          workDir: '/workspace',
          env: stepEnv,
          timeout: step.timeout || globalTimeout,
          continueOnError: step.continueOnError,
        });
      }

      // 4. AfterAll
      if (afterAll) {
        await this.executeStepCommand(container, job.id, 'afterAll', afterAll, {
          workDir: '/workspace',
          timeout: globalTimeout,
        });
      }

      await this.client.updateJob(job.id, { status: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.client.updateJob(job.id, { status: 'failed', error: msg });
    } finally {
      await this.cleanupContainer(container);
    }
  }

  /**
   * Prepares the Docker container for the job.
   * Pulls the image and creates the container with necessary environment variables.
   *
   * @param jobId - The ID of the job.
   * @param baseImage - The base image to use (default: node:22).
   * @param env - Environment variables for the container.
   * @returns The created Docker container.
   */
  private async prepareContainer(
    jobId: string,
    baseImage: string | undefined,
    env: Record<string, string>,
  ): Promise<Docker.Container> {
    await this.client.updateJob(jobId, {
      stepName: 'fetch-pr',
      status: 'running',
      logs: 'Initializing runner...\n',
    });

    const image = baseImage || 'node:22';
    await this.logOutput(jobId, `Checking image ${image}...\n`);

    try {
      await prepareImage({ docker, image });
    } catch (e) {
      throw new Error(`Failed to pull image ${image}: ${e}`);
    }

    await this.logOutput(jobId, `Creating container...\n`);

    const envList = Object.entries(env).map(([k, v]) => `${k}=${v}`);

    const container = await createRawContainer({
      image,
      env: envList,
    });

    await this.client.updateJob(jobId, {
      stepName: 'fetch-pr',
      status: 'success',
      logs: 'Container ready.\n',
    });

    return container;
  }

  /**
   * Executes a command inside the container as a step.
   * Updates job status and logs output.
   *
   * @param container - The Docker container.
   * @param jobId - The ID of the job.
   * @param stepName - The name of the step.
   * @param command - The command to execute.
   * @param options - Execution options (timeout, env, workDir, continueOnError).
   */
  private async executeStepCommand(
    container: Docker.Container,
    jobId: string,
    stepName: string,
    command: string,
    options: {
      timeout?: number;
      env?: Record<string, string>;
      workDir?: string;
      continueOnError?: boolean;
    } = {},
  ) {
    await this.client.updateJob(jobId, { stepName, status: 'running' });

    const result = await exec(container, command, {
      workDir: options.workDir,
      env: options.env,
      timeout: options.timeout,
      onOutput: (data) => this.logOutput(jobId, data),
    });

    if (result.exitCode !== 0) {
      if (options.continueOnError) {
        // Log failure but continue
        await this.logOutput(
          jobId,
          `Step ${stepName} failed with exit code ${result.exitCode} (ignored)\n`,
        );
      } else {
        await this.client.updateJob(jobId, { stepName, status: 'failed' });
        throw new Error(`Step ${stepName} failed with exit code ${result.exitCode}`);
      }
    }

    await this.client.updateJob(jobId, { stepName, status: 'success' });
  }

  /**
   * Cleans up the container after job execution.
   * @param container - The container to remove.
   */
  private async cleanupContainer(container: Docker.Container | undefined) {
    if (container) {
      try {
        await removeContainer(container.id);
      } catch (e) {
        console.error('Failed to remove container:', e);
      }
    }
  }

  /**
   * Helper to stream logs to the client.
   * @param jobId - The ID of the job.
   * @param logs - The log content.
   */
  private async logOutput(jobId: string, logs: string) {
    // Fire and forget to avoid blocking execution
    this.client.updateJob(jobId, { logs }).catch(console.error);
  }
}
