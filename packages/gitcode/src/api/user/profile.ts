import { z } from 'zod';
import { API_BASE } from '../constants';

export const userProfileSchema = z.object({
  avatar_url: z.string(),
  followers_url: z.string(),
  html_url: z.string(),
  id: z.string(),
  login: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  bio: z.string().optional(),
  blog: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  followers: z.number(),
  following: z.number(),
  top_languages: z.array(z.string()),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserProfileResponse = UserProfile;

export function userProfileUrl(): string {
  return `${API_BASE}/user`;
}
