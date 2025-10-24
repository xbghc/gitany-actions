import { Command } from 'commander';
import { saveToken, removeToken, getToken, getConfigPath } from '../utils/config.js';

export function authCommand(): Command {
  const authProgram = new Command('auth').description('Authentication commands');

  authProgram
    .command('set-token')
    .description('Set authentication token')
    .argument('<token>', 'Authentication token')
    .action(async (token) => {
      try {
        await saveToken(token.trim());
        console.log('Token saved successfully');
        console.log(`Config file: ${getConfigPath()}`);
      } catch (err) {
        console.error('Failed to save token:', err);
        process.exit(1);
      }
    });

  authProgram
    .command('remove-token')
    .description('Remove authentication token')
    .action(async () => {
      try {
        await removeToken();
        console.log('Token removed successfully');
      } catch (err) {
        console.error('Failed to remove token:', err);
        process.exit(1);
      }
    });

  authProgram
    .command('status')
    .description('Show authentication status')
    .action(() => {
      const token = getToken();
      if (token) {
        const maskedToken = `${token.slice(0, 4)}...${token.slice(-4)}`;
        console.log(`Authenticated: ${maskedToken}`);
        if (process.env.GITCODE_TOKEN) {
          console.log('Source: Environment variable (GITCODE_TOKEN)');
        } else {
          console.log(`Source: Config file (${getConfigPath()})`);
        }
      } else {
        console.log('Not authenticated');
        console.log('Run "gitcode auth set-token <token>" to authenticate');
      }
    });

  return authProgram;
}
