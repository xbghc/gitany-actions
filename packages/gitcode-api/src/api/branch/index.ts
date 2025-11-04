import { z } from 'zod';
import { repoSchema } from '../repo/index.js';
import { userSummarySchema } from '../user/summary.js';

export const branchSchema = z.object({
  label: z.string(),
  ref: z.string(),
  sha: z.string(),
  repo: repoSchema.nullable().optional(),
  user: userSummarySchema.nullable().optional(),
  // 省略部分内容
});

export type Branch = z.infer<typeof branchSchema>;
