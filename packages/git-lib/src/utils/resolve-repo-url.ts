import { GitClient } from '../client';
import { GitNotFoundError } from '../errors';

const DEFAULT_HOST = 'gitcode.com';

function stripGitSuffix(segment: string): string {
  return segment.replace(/\.git$/i, '');
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function sanitizeResourceSegment(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  const withoutQuery = segment.split('?')[0];
  const withoutFragment = withoutQuery.split('#')[0];
  return decodeSegment(stripGitSuffix(withoutFragment));
}

function parseResourceNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.startsWith('#') ? value.slice(1) : value;
  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export type ResolvedRepoResource =
  | { type: 'issue'; number: number }
  | { type: 'pull'; number: number };

export interface ResolvedRepoUrl {
  repoUrl: string;
  owner?: string;
  repo?: string;
  host?: string;
  resource?: ResolvedRepoResource;
}

function parseResource(
  segments: string[],
  hash?: string,
): ResolvedRepoResource | undefined {
  if (segments.length > 0) {
    const [firstRaw, secondRaw] = segments;
    const first = sanitizeResourceSegment(firstRaw)?.toLowerCase();
    const second = sanitizeResourceSegment(secondRaw);

    if (first && ['issue', 'issues'].includes(first)) {
      const number = parseResourceNumber(second);
      if (number !== undefined) {
        return { type: 'issue', number };
      }
    }

    if (first && ['pull', 'pulls', 'pr'].includes(first)) {
      const number = parseResourceNumber(second);
      if (number !== undefined) {
        return { type: 'pull', number };
      }
    }

    const direct = sanitizeResourceSegment(firstRaw);
    const directNumber = parseResourceNumber(direct);
    if (directNumber !== undefined) {
      return { type: 'issue', number: directNumber };
    }
  }

  if (hash) {
    const number = parseResourceNumber(hash);
    if (number !== undefined) {
      return { type: 'issue', number };
    }
  }

  return undefined;
}

function buildResolved(
  protocol: string | undefined,
  host: string,
  owner: string,
  repo: string,
  resourceSegments: string[],
  hash?: string,
): ResolvedRepoUrl {
  const normalizedProtocol = protocol === 'http:' ? 'http' : 'https';
  const repoUrl = `${normalizedProtocol}://${host}/${owner}/${repo}`;
  const resource = parseResource(resourceSegments, hash);
  return { host, owner, repo, repoUrl, resource };
}

function parseHttpLikeUrl(raw: string): ResolvedRepoUrl | undefined {
  try {
    const url = new URL(raw);
    if (!url.hostname) return undefined;
    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeSegment(segment));
    if (segments.length < 2) return undefined;
    const owner = segments[0];
    const repo = stripGitSuffix(segments[1]);
    const resourceSegments = segments.slice(2);
    return buildResolved(url.protocol, url.host, owner, repo, resourceSegments, url.hash);
  } catch {
    return undefined;
  }
}

function parseSshUrl(raw: string): ResolvedRepoUrl | undefined {
  const match = raw.match(/^git@([^:]+):(.+)$/i);
  if (!match) return undefined;
  const [, host, path] = match;
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeSegment(segment));
  if (segments.length < 2) return undefined;
  const owner = segments[0];
  const repo = stripGitSuffix(segments[1]);
  const resourceSegments = segments.slice(2);
  return buildResolved('https:', host, owner, repo, resourceSegments);
}

function parseShorthand(raw: string): ResolvedRepoUrl | undefined {
  let input = raw.trim();
  if (!input) return undefined;

  let hash: string | undefined;
  const hashIndex = input.indexOf('#');
  if (hashIndex >= 0) {
    hash = input.slice(hashIndex + 1);
    input = input.slice(0, hashIndex);
  }

  const segments = input
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeSegment(segment));

  if (segments.length < 2) return undefined;

  let host = DEFAULT_HOST;
  let ownerIndex = 0;
  if (segments.length >= 3 && segments[0].includes('.')) {
    host = segments[0];
    ownerIndex = 1;
  }

  const owner = segments[ownerIndex];
  const repo = stripGitSuffix(segments[ownerIndex + 1]);
  const resourceSegments = segments.slice(ownerIndex + 2);
  return buildResolved('https:', host, owner, repo, resourceSegments, hash);
}

export function parseRepoUrl(raw: string): ResolvedRepoUrl {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Repository URL cannot be empty');
  }

  const parsedHttp = parseHttpLikeUrl(trimmed);
  if (parsedHttp) {
    return parsedHttp;
  }

  const parsedSsh = parseSshUrl(trimmed);
  if (parsedSsh) {
    return parsedSsh;
  }

  const parsedShorthand = parseShorthand(trimmed);
  if (parsedShorthand) {
    return parsedShorthand;
  }

  return { repoUrl: trimmed };
}

export async function resolveRepoUrl(
  url?: string,
  options: { cwd?: string } = {},
): Promise<ResolvedRepoUrl> {
  if (url) {
    return parseRepoUrl(url);
  }
  const client = new GitClient(options.cwd);
  try {
    const result = await client.run(['remote', 'get-url', 'origin']);
    if (result.code !== 0) {
      throw new Error(
        result.stderr.trim() ||
          'Failed to get remote URL. Provide repository URL or run inside a git repo.',
      );
    }
    return parseRepoUrl(result.stdout.trim());
  } catch (err) {
    if (err instanceof GitNotFoundError) {
      throw new GitNotFoundError('git not found. Provide repository URL or install git.');
    }
    throw err;
  }
}
