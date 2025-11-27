import { withClient } from '../utils/with-client.js';
import { parseGitRemotes } from '../utils/parse-git-remotes.js';
import type { UserProfile } from '@xbghc/gitcode-api';

interface StatusOptions {
  json?: boolean;
}

type GitRemote = Awaited<ReturnType<typeof parseGitRemotes>>[number];

interface StatusOutput {
  user: {
    id: string;
    name: string;
    email?: string;
    login: string;
    namespace?: string;
  };
  remotes: GitRemote[];
}

export async function statusCommand(options: StatusOptions = {}): Promise<void> {
  await withClient(async (client) => {
    // Get user profile
    const userProfile: UserProfile = await client.user.getProfile();

    // Try to get git remotes (will be empty if not in a git repo)
    const remotes = await parseGitRemotes();

    if (options.json) {
      // JSON output
      const output: StatusOutput = {
        user: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          login: userProfile.login,
          namespace: userProfile.login, // Using login as namespace
        },
        remotes,
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Formatted text output
      console.log('\nGitCode Status');
      console.log('━'.repeat(50));

      // User section
      console.log('\n👤 User');
      console.log(`   Name:      ${userProfile.name}`);
      console.log(`   ID:        ${userProfile.id}`);
      console.log(`   Login:     ${userProfile.login}`);
      console.log(`   Email:     ${userProfile.email}`);
      if (userProfile.html_url) {
        console.log(`   URL:       ${userProfile.html_url}`);
      }

      // Git remotes section
      console.log('\n📦 Git Remotes');
      if (remotes.length === 0) {
        console.log('   (not in a git repository or no remotes configured)');
      } else {
        for (const remote of remotes) {
          const warning = remote.isGitCode ? '   ' : '   ⚠️  ';
          const suffix = remote.isGitCode ? '' : ' (not GitCode)';
          console.log(`${warning}${remote.name.padEnd(10)} ${remote.url}${suffix}`);
        }
      }

      console.log();
    }
  }, 'Failed to get status. Please ensure you are authenticated (use: gitcode auth set-token)');
}
