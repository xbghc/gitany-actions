/**
 * Issues - Create
 * Endpoint: POST /api/v5/repos/{owner}/issues
 */

import { z } from 'zod';
import { API_BASE } from '../constants';

/**
 * Request body for creating an issue.
 */
export interface CreateIssueBody {
  /** Repository name (without .git). */
  repo: string;
  /** Issue title. */
  title: string;
  /** Issue body/description. */
  body: string;
  /** Assignee username (optional). */
  assignee?: string;
  /** Milestone number (optional). */
  milestone?: number;
  /** Comma-separated label names (optional). */
  labels?: string;
  /** Security hole level (optional). */
  security_hole?: string;
  /** Template path (optional). */
  template_path?: string;
}

/**
 * Path params for create issue request.
 */
export type CreateIssueParams = {
  /** Repository owner (user or organization). */
  owner: string;
  /** Issue data. */
  body: CreateIssueBody;
};

export const issueLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
});

export type IssueLabel = z.infer<typeof issueLabelSchema>;

/**
 * Complete Issue representation with all fields.
 */
export const createdIssueSchema = z.object({
  id: z.number(),
  html_url: z.string(),
  number: z.string(),
  state: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  user: z
    .object({
      id: z.string(),
      login: z.string(),
      name: z.string(),
    })
    .optional(),
  assignee: z
    .object({
      id: z.string(),
      login: z.string(),
      name: z.string(),
      avatar_url: z.string(),
      html_url: z.string(),
      type: z.string(),
    })
    .nullable()
    .optional(),
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
    human_name: z.string(),
    path: z.string(),
    name: z.string(),
    url: z.string(),
    assigner: z.record(z.string(), z.unknown()).optional(),
    paas: z.string().optional(),
  }),
  created_at: z.string(),
  updated_at: z.string(),
  labels: z.array(issueLabelSchema).optional(),
  issue_state: z.string().optional(),
  priority: z.number().optional(),
  issue_type: z.string().optional(),
  issue_state_detail: z
    .object({
      title: z.string(),
      serial: z.number(),
      id: z.number(),
    })
    .optional(),
  issue_type_detail: z
    .object({
      title: z.string(),
      id: z.number(),
      is_system: z.boolean(),
    })
    .optional(),
  comments: z.number().optional(),
  parent_id: z.number().optional(),
  url: z.string().optional(),
});

export type CreatedIssue = z.infer<typeof createdIssueSchema>;

/**
 * Builds the request path for creating an issue.
 */
export function createIssueUrl(owner: string): string {
  return `${API_BASE}/repos/${encodeURIComponent(owner)}/issues`;
}
