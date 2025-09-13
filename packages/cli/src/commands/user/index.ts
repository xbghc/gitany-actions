import { Command } from 'commander';
import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

export async function userShowCommand(): Promise<void> {
  try {
    const client = new GitcodeClient();
    const user = await client.user.getProfile();

    console.log('用户信息:');
    console.log(`  ID: ${user.id}`);
    console.log(`  用户名: ${user.name}`);
    console.log(`  邮箱: ${user.email}`);
  } catch (error) {
    logger.error({ error }, '获取用户信息失败');
    process.exit(1);
  }
}

export function userCommand(): Command {
  const userProgram = new Command('user').description('User commands');

  userProgram.command('show').description('Show current user information').action(userShowCommand);

  return userProgram;
}
