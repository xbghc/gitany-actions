import { Repo } from '../repo';

export interface Branch {
  label: string;
  ref: string;
  sha: string;
  repo: Repo;
  user: unknown;
}