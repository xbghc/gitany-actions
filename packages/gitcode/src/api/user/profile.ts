import { API_BASE } from '../constants';

export interface UserProfile {
  avatar_url: string;
  followers_url: string;
  html_url: string;
  id: string;
  login: string;
  name: string;
  type: string;
  url: string;
  bio?: string;
  blog?: string;
  company?: string;
  email?: string;
  followers: number;
  following: number;
  top_languages: string[];
}

export type UserProfileResponse = UserProfile;

export function userProfileUrl(): string {
  return `${API_BASE}/user`;
}