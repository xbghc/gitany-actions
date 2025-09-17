import { z } from 'zod';
import { API_BASE } from '../constants';

export const userNamespaceSchema = z.object({
  id: z.number(),
  path: z.string(),
  name: z.string(),
  html_url: z.string(),
  type: z.string(),
});

export type UserNamespace = z.infer<typeof userNamespaceSchema>;

export function userNamespaceUrl(): string {
  return `${API_BASE}/user/namespace`;
}
