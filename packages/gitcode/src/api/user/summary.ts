import { z } from 'zod';

/** Minimal user object commonly embedded in issue/pull payloads */
export const userSummarySchema = z.object({
  avatar_url: z.string(),
  html_url: z.string(),
  id: z.string(),
  login: z.string(),
  name: z.string(),
});

export type UserSummary = z.infer<typeof userSummarySchema>;

