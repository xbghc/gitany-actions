import { z } from 'zod';
import { API_BASE } from '../constants';

export const webhookSchema = z.object({
  id: z.number(),
  url: z.string(),
  test_url: z.string(),
  ping_url: z.string(),
  name: z.string(),
  events: z.array(z.string()),
  active: z.boolean(),
  config: z.object({
    url: z.string(),
    content_type: z.string(),
    secret: z.string().optional(),
    insecure_ssl: z.string(),
  }),
  updated_at: z.string(),
  created_at: z.string(),
  last_response: z
    .object({
      code: z.any().nullable(),
      status: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type Webhook = z.infer<typeof webhookSchema>;
export type Webhooks = z.infer<typeof webhookSchema>[];

export function webhooksUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/hooks`;
}

export function webhookUrl(owner: string, repo: string, id: number): string {
  return `${API_BASE}/repos/${owner}/${repo}/hooks/${id}`;
}
