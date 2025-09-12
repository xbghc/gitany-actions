import { z } from 'zod';
import { repoSchema } from '../repo';

export const branchSchema = z.object({
  label: z.string(),
  ref: z.string(),
  sha: z.string(),
  repo: repoSchema,
  user: z.unknown(),
  // 省略部分内容
});

export type Branch = z.infer<typeof branchSchema>;
