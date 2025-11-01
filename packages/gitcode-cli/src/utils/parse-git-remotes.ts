import fs from 'node:fs';
import path from 'node:path';

export interface GitRemote {
  name: string;
  url: string;
  fetch?: string;
  isGitCode: boolean;
}

/**
 * Check if a URL belongs to GitCode platform
 * @param url - Git remote URL
 * @returns true if URL is from gitcode.com or gitcode.net
 */
export function isGitCodeUrl(url: string): boolean {
  return /gitcode\.(com|net)/i.test(url);
}

/**
 * Parse .git/config file and extract all remote configurations
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns Array of git remotes with name, url, and optional fetch config
 */
export function parseGitRemotes(cwd: string = process.cwd()): GitRemote[] {
  const gitConfigPath = path.join(cwd, '.git', 'config');

  // If not in a git repository, return empty array
  if (!fs.existsSync(gitConfigPath)) {
    return [];
  }

  const content = fs.readFileSync(gitConfigPath, 'utf-8');
  const lines = content.split('\n');

  const remotes: GitRemote[] = [];
  let currentRemote: Partial<GitRemote> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for [remote "name"] section
    const remoteMatch = trimmed.match(/^\[remote\s+"([^"]+)"\]$/) || trimmed.match(/^\[remote\s+'([^']+)'\]$/);
    if (remoteMatch) {
      // Save previous remote if exists
      if (currentRemote && currentRemote.name && currentRemote.url) {
        remotes.push(currentRemote as GitRemote);
      }
      // Start new remote
      currentRemote = { name: remoteMatch[1] };
      continue;
    }

    // If we hit another section, save current remote and reset
    if (trimmed.startsWith('[') && currentRemote) {
      if (currentRemote.name && currentRemote.url) {
        remotes.push(currentRemote as GitRemote);
      }
      currentRemote = null;
      continue;
    }

    // Extract url and fetch from current remote section
    if (currentRemote) {
      const urlMatch = trimmed.match(/^url\s*=\s*(.+)$/);
      if (urlMatch) {
        currentRemote.url = urlMatch[1].trim();
        continue;
      }

      const fetchMatch = trimmed.match(/^fetch\s*=\s*(.+)$/);
      if (fetchMatch) {
        currentRemote.fetch = fetchMatch[1].trim();
        continue;
      }
    }
  }

  // Don't forget the last remote
  if (currentRemote && currentRemote.name && currentRemote.url) {
    remotes.push(currentRemote as GitRemote);
  }

  // Add isGitCode field to all remotes
  return remotes.map((remote) => ({
    ...remote,
    isGitCode: isGitCodeUrl(remote.url),
  }));
}
