import { initContract } from '@ts-rest/core';
import { prContract } from './pr.contract.js';
import { issueContract } from './issue.contract.js';
import { workflowContract } from './workflow.contract.js';
import { workflowConfigContract } from './workflow-config.contract.js';
import { userContract } from './user.contract.js';
import { eventsContract } from './events.contract.js';
import { oauthContract } from './oauth.contract.js';

const c = initContract();

// 合并所有契约
export const contract = c.router({
  pr: prContract,
  issue: issueContract,
  workflow: workflowContract,
  workflowConfig: workflowConfigContract,
  user: userContract,
  events: eventsContract,
  oauth: oauthContract,
});

// 导出类型（供客户端使用）
export type AppRouter = typeof contract;

// 重新导出子契约
export { prContract } from './pr.contract.js';
export { issueContract } from './issue.contract.js';
export { workflowContract } from './workflow.contract.js';
export { workflowConfigContract } from './workflow-config.contract.js';
export { userContract } from './user.contract.js';
export { eventsContract } from './events.contract.js';
export { oauthContract } from './oauth.contract.js';

// 重新导出 schemas
export * from './schemas/index.js';
