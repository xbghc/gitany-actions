import got from 'got';
import type { RunnerRegisterResponse, RunnerJob, JobUpdate } from '../types/runner.js';

export class RunnerClient {
  private baseUrl: string;
  private token?: string;
  private runnerId?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  setCredentials(runnerId: string, token: string) {
    this.runnerId = runnerId;
    this.token = token;
  }

  async register(name: string, version: string = '1.0.0'): Promise<RunnerRegisterResponse> {
    const res = await got.post(`${this.baseUrl}/api/runners/register`, {
      json: { name, version },
      responseType: 'json',
    });
    return res.body as RunnerRegisterResponse;
  }

  async poll(): Promise<RunnerJob | null> {
    if (!this.runnerId || !this.token) throw new Error('Not registered');

    try {
      const res = await got.post(`${this.baseUrl}/api/runners/poll`, {
        json: { runnerId: this.runnerId, token: this.token },
        responseType: 'json',
        timeout: { request: 30000 },
      });
      return (res.body as RunnerJob) || null;
    } catch (error) {
      console.error('Poll failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  async updateJob(jobId: string, update: Partial<Omit<JobUpdate, 'runnerId' | 'token'>>) {
    if (!this.runnerId || !this.token) throw new Error('Not registered');

    try {
      await got.post(`${this.baseUrl}/api/runners/jobs/${jobId}/update`, {
        json: {
          runnerId: this.runnerId,
          token: this.token,
          ...update,
        },
      });
    } catch (error) {
      console.error('Update job failed:', error instanceof Error ? error.message : error);
    }
  }
}
