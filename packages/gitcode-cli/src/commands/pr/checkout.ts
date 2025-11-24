import type { GitCodeClient, PullRequestDetail } from '@xbghc/gitcode-api';
import { parseGitUrl } from '@xbghc/gitcode-api';
import { simpleGit, SimpleGit } from 'simple-git';
import { parseGitRemotes } from '../../utils/parse-git-remotes.js';
import { resolveRepoUrl } from '../../utils/resolve-repo-url.js';
import { withClient } from '../../utils/with-client.js';

interface CheckoutOptions {
  branch?: string;
  force?: boolean;
}

/**
 * Converts an HTML URL to an SSH clone URL
 * e.g. https://gitcode.com/owner/repo -> git@gitcode.com:owner/repo.git
 */
function toSshUrl(htmlUrl: string): string {
  // Simple heuristic replacement
  return htmlUrl.replace(/^https?:\/\/([^/]+)\//, 'git@$1:') + '.git';
}

/**
 * Converts an HTML URL to an HTTPS clone URL
 * e.g. https://gitcode.com/owner/repo -> https://gitcode.com/owner/repo.git
 */
function toHttpsUrl(htmlUrl: string): string {
  return htmlUrl + '.git';
}

async function fetchPullRequest(
  client: GitCodeClient,
  repoUrl: string,
  prId: number,
): Promise<PullRequestDetail> {
  try {
    return await client.pr.get(repoUrl, prId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      console.error(`Pull request #${prId} not found.`);
      process.exit(1);
    }
    throw error;
  }
}

async function ensureGitRepo(git: SimpleGit): Promise<void> {
  if (!(await git.checkIsRepo())) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }
}

async function setupRemote(git: SimpleGit, pr: PullRequestDetail): Promise<string> {
  const headRepo = pr.head.repo;
  const baseRepo = pr.base.repo;

  if (!headRepo || !baseRepo) {
    console.error('Error: PR data is missing repository information');
    process.exit(1);
  }

  const isFork = headRepo.full_name !== baseRepo.full_name;

  // If not a fork, use origin
  if (!isFork) {
    return 'origin';
  }

  // Get existing remotes
  const remotes = await parseGitRemotes();

  // Determine preferred protocol (SSH vs HTTPS)
  const originRemote = remotes.find((r) => r.name === 'origin');
  const preferSsh = originRemote?.url.startsWith('git@') || originRemote?.url.startsWith('ssh://');

  const headOwner = headRepo.owner?.login || headRepo.full_name.split('/')[0];
  const headUrl = preferSsh ? toSshUrl(headRepo.html_url) : toHttpsUrl(headRepo.html_url);

  // Parse the head repository URL to get the canonical owner/repo
  const targetRepoInfo = parseGitUrl(headRepo.html_url);
  if (!targetRepoInfo) {
    // If parsing fails, fall back to adding the remote directly
    console.log(`Adding remote ${headOwner} => ${headUrl}`);
    await git.addRemote(headOwner, headUrl);
    return headOwner;
  }

  // Try to find existing remote for this fork
  const existingRemote = remotes.find((r) => {
    const remoteInfo = parseGitUrl(r.url);
    if (!remoteInfo) return false;

    return remoteInfo.owner === targetRepoInfo.owner && remoteInfo.repo === targetRepoInfo.repo;
  });

  if (existingRemote) {
    return existingRemote.name;
  }

  // Add new remote
  console.log(`Adding remote ${headOwner} => ${headUrl}`);
  await git.addRemote(headOwner, headUrl);
  return headOwner;
}

async function checkoutBranch(
  git: SimpleGit,
  remoteName: string,
  remoteBranch: string,
  localBranchName: string,
): Promise<void> {
  console.log(`Fetching ${remoteName}/${remoteBranch}...`);
  await git.fetch(remoteName, remoteBranch);

  const branches = await git.branchLocal();
  const branchExists = branches.all.includes(localBranchName);

  if (branchExists) {
    console.log(`Switching to branch ${localBranchName}`);
    await git.checkout(localBranchName);

    try {
      const status = await git.status();
      if (status.current === localBranchName) {
        console.log(`Pulling from ${remoteName}/${remoteBranch}`);
        // Use --ff-only to prevent unexpected merges
        await git.pull(remoteName, remoteBranch, { '--ff-only': null });
      }
    } catch (e) {
      console.warn(`Could not pull latest changes: ${(e as Error).message}`);
      console.warn(
        `Local branch '${localBranchName}' has diverged from ${remoteName}/${remoteBranch}.`,
      );
    }
  } else {
    // Create new branch tracking the remote branch
    console.log(`Switching to new branch ${localBranchName}`);
    await git.checkout(['-b', localBranchName, '--track', `${remoteName}/${remoteBranch}`]);
  }
}

export async function checkoutCommand(
  prNumber: string,
  urlArg?: string,
  options: CheckoutOptions = {},
): Promise<void> {
  const repoUrl = await resolveRepoUrl(urlArg);
  const prId = parseInt(prNumber, 10);

  if (isNaN(prId)) {
    console.error('Error: Invalid PR number');
    process.exit(1);
  }

  await withClient(async (client) => {
    const pr = await fetchPullRequest(client, repoUrl, prId);
    const git = simpleGit();

    await ensureGitRepo(git);

    const remoteName = await setupRemote(git, pr);
    const remoteBranch = pr.head.ref;
    const localBranchName = options.branch || remoteBranch;

    await checkoutBranch(git, remoteName, remoteBranch, localBranchName);
  });
}
