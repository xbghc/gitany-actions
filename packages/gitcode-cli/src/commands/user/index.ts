import { Command } from 'commander';
import { withClient } from '../../utils/with-client';
import { createLogger } from '@gitany/shared';

const logger = createLogger('gitcode-cli:user');

export async function userShowCommand(): Promise<void> {
  await withClient(async (client) => {
    const user = await client.user.getProfile();

    logger.info({
      id: user.id,
      name: user.name,
      email: user.email,
      html_url: user.html_url,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      top_languages: user.top_languages
    }, '用户信息');
  }, '获取用户信息失败');
}

export async function userNamespaceCommand(): Promise<void> {
  await withClient(async (client) => {
    const namespace = await client.user.getNamespace();

    logger.info({
      id: namespace.id,
      path: namespace.path,
      name: namespace.name,
      html_url: namespace.html_url,
      type: namespace.type
    }, '用户命名空间');
  }, '获取用户命名空间失败');
}

export function userCommand(): Command {
  const userProgram = new Command('user').description('User commands');

  userProgram.command('show').description('Show current user information').action(userShowCommand);
  userProgram.command('namespace').description('Show user namespace').action(userNamespaceCommand);

  return userProgram;
}
