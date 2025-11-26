import { randomUUID } from 'crypto';
import type { Runner, RunnerJob } from '@xbghc/gitcode-actions';
import { logger } from '../utils/logger.js';

export class RunnerService {
  private runners = new Map<string, Runner>();
  private jobQueue: RunnerJob[] = [];
  // Job assignments: runnerId -> jobId
  private assignments = new Map<string, string>();

  register(name: string, ip?: string, version?: string): Runner {
    const id = randomUUID();
    const token = randomUUID(); // In real app, hash this
    const runner: Runner = {
      id,
      name,
      token,
      lastSeen: new Date().toISOString(),
      status: 'online',
      ip,
      version,
    };
    this.runners.set(id, runner);
    return runner;
  }

  validateRunner(id: string, token: string): boolean {
    const runner = this.runners.get(id);
    return !!runner && runner.token === token;
  }

  heartbeat(id: string) {
    const runner = this.runners.get(id);
    if (runner) {
      runner.lastSeen = new Date().toISOString();
      // Update status if it was offline
      if (runner.status === 'offline') {
        runner.status = runner.currentJobId ? 'busy' : 'online';
      }
    }
  }

  enqueueJob(job: RunnerJob) {
    logger.info({ jobId: job.id, workflowId: job.workflowId }, 'Job enqueued');
    this.jobQueue.push(job);
  }

  pollJob(runnerId: string): RunnerJob | null {
    this.heartbeat(runnerId);
    const runner = this.runners.get(runnerId);
    if (!runner) return null;

    // If runner is already busy with a job, don't give a new one
    // Unless it's reporting it's ready (which is what poll implies)
    // So if it polls, we assume it's free.

    if (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift()!;
      runner.status = 'busy';
      runner.currentJobId = job.id;
      this.assignments.set(runnerId, job.id);
      logger.info({ jobId: job.id, runnerName: runner.name, runnerId }, 'Job assigned to runner');
      return job;
    }

    runner.status = 'online';
    runner.currentJobId = undefined;
    return null;
  }

  completeJob(runnerId: string) {
    const runner = this.runners.get(runnerId);
    if (runner) {
      runner.status = 'online';
      runner.currentJobId = undefined;
      this.assignments.delete(runnerId);
    }
  }

  getRunner(id: string) {
    return this.runners.get(id);
  }

  getAllRunners() {
    return Array.from(this.runners.values());
  }

  // Cleanup old runners (e.g. no heartbeat for 5 mins)
  cleanupRunners(maxAge = 5 * 60 * 1000) {
    const now = Date.now();
    for (const [_id, runner] of this.runners.entries()) {
      const lastSeen = new Date(runner.lastSeen).getTime();
      if (now - lastSeen > maxAge) {
        // Mark as offline instead of deleting?
        runner.status = 'offline';
        // If it was assigned a job, maybe requeue it?
        // For simplicity, we won't requeue yet.
      }
    }
  }
}

export const runnerService = new RunnerService();
