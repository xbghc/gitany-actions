import { Command } from 'commander';
import { GitcodeAuth } from '@gitany/gitcode';

export function authCommand(): Command {
  const auth = new GitcodeAuth();
  
  const authProgram = new Command('auth')
    .description('Authentication commands');

  authProgram
    .command('set-token')
    .description('Set authentication token')
    .argument('<token>', 'Authentication token')
    .action((token) => {
      auth.setToken(token.trim())
        .then(() => {
          console.log('Token saved successfully');
        })
        .catch((error) => {
          console.error('Failed to save token:', error);
          process.exit(1);
        });
    });

  return authProgram;
}
