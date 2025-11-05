import { z } from 'zod';
import { API_BASE } from '../constants.js';

export const userNamespaceSchema = z.object({
  id: z.number(),
  path: z.string(),
  name: z.string(),
  html_url: z.string(),
  type: z.string(),
});

export type UserNamespace = z.infer<typeof userNamespaceSchema>;

// TODO 移除
export function userNamespaceUrl(): string {
  return `${API_BASE}/user/namespace`;
}
