import { z } from 'zod';

export const repoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  human_name: z.string(),
  url: z.string(),
  path: z.string(),
  name: z.string(),
  description: z.string().optional(),
  private: z.boolean(),
  public: z.boolean(),
  namespace: z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    develop_mode: z.string(),
    region: z.string().nullable(),
    cell: z.string(),
    kind: z.string(),
    full_path: z.string(),
    full_name: z.string(),
    parent_id: z.number().nullable(),
    visibility_level: z.number(),
    enable_file_control: z.boolean(),
    owner_id: z.number().nullable(),
  }),
  empty_repo: z.boolean().nullable(),
  starred: z.boolean().nullable(),
  visibility: z.string(),
  owner: z.any().nullable(),
  creator: z.any().nullable(),
  forked_from_project: z.any().nullable(),
  item_type: z.string().nullable(),
  main_repository_language: z.string().nullable(),
  homepage: z.string().optional(),
  html_url: z.string(),
});

export type Repo = z.infer<typeof repoSchema>;

export * from './settings';
export * from './files';
export * from './commits';
export * from './webhooks';
