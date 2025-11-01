import { z } from 'zod';

export const repoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  human_name: z.string(),
  path: z.string(),
  name: z.string(),
  description: z.string().optional(),
  owner: z.any().nullable(),
  html_url: z.string(),
});

export type Repo = z.infer<typeof repoSchema>;

export * from './settings.js';
export * from './files.js';
export * from './commits.js';
export * from './webhooks.js';
