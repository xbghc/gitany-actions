import { z } from 'zod';
import { userSummarySchema } from '../user/summary.js';

export const repoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  human_name: z.string(),
  path: z.string(),
  name: z.string(),
  description: z.string().optional(),
  owner: userSummarySchema.optional(),
  html_url: z.string(),
});

export type Repo = z.infer<typeof repoSchema>;

export * from './commits.js';
export * from './files.js';
export * from './notifications.js';
export * from './settings.js';
export * from './webhooks.js';
