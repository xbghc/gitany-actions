import { Command } from 'commander';
import { withClient } from '../../utils/with-client';

export async function userShowCommand(): Promise<void> {
  await withClient(async (client) => {
    const user = await client.user.getProfile();
    console.log('用户信息');
    console.log(`  ID:          ${user.id}`);
    console.log(`  Name:        ${user.name}`);
    console.log(`  Email:       ${user.email}`);
    if (user.html_url) console.log(`  URL:         ${user.html_url}`);
    if (user.bio) console.log(`  Bio:         ${user.bio}`);
    console.log(`  Followers:   ${user.followers}`);
    console.log(`  Following:   ${user.following}`);
    if (user.top_languages) console.log(`  Top Langs:   ${user.top_languages}`);
  }, '获取用户信息失败');
}

export async function userNamespaceCommand(): Promise<void> {
  await withClient(async (client) => {
    const namespace = await client.user.getNamespace();
    console.log('用户命名空间');
    console.log(`  ID:    ${namespace.id}`);
    console.log(`  Path:  ${namespace.path}`);
    console.log(`  Name:  ${namespace.name}`);
    if (namespace.html_url) console.log(`  URL:   ${namespace.html_url}`);
    console.log(`  Type:  ${namespace.type}`);
  }, '获取用户命名空间失败');
}

export function userCommand(): Command {
  const userProgram = new Command('user').description('User commands');

  userProgram.command('show').description('Show current user information').action(userShowCommand);
  userProgram.command('namespace').description('Show user namespace').action(userNamespaceCommand);

  return userProgram;
}
