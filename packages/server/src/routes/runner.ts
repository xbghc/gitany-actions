import { Router } from 'express';
import { runnerService } from '../services/runner-service.js';
import type { JobUpdate, RunnerRegisterRequest } from '@xbghc/gitcode-actions';
import { workflowService } from '../services/workflow-service.js';

const router = Router();

// Register a new runner
router.post('/register', (req, res) => {
  const { name, version } = req.body as RunnerRegisterRequest;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const runner = runnerService.register(name, req.ip, version);
  res.json({ id: runner.id, token: runner.token });
});

// Poll for jobs
router.post('/poll', (req, res) => {
  const { runnerId, token } = req.body;

  if (!runnerService.validateRunner(runnerId, token)) {
    return res.status(401).json({ error: 'Invalid runner credentials' });
  }

  const job = runnerService.pollJob(runnerId);
  res.json(job); // null if no job
});

// Update job status
router.post('/jobs/:id/update', (req, res) => {
  const { id } = req.params;
  const { runnerId, token, status, logs, error, stepName } = req.body as JobUpdate;

  if (!runnerService.validateRunner(runnerId, token)) {
    return res.status(401).json({ error: 'Invalid runner credentials' });
  }

  // Forward updates to WorkflowService
  workflowService.handleRunnerUpdate(id, { status, logs, error, stepName });

  if (status === 'success' || status === 'failed') {
    runnerService.completeJob(runnerId);
  } else {
    runnerService.heartbeat(runnerId);
  }

  res.json({ success: true });
});

export const runnerRoutes: Router = router;
