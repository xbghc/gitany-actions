import { z } from 'zod';

export const repoSchema = z.object({
  id: z.number(),
  html_url: z.string(),
  // 省略部分内容
});

export type Repo = z.infer<typeof repoSchema>;
