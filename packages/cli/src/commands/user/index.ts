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
    console.log(`  个人主页: ${user.html_url}`);
    console.log(`  简介: ${user.bio || '无'}`);
    console.log(`  关注者: ${user.followers}`);
    console.log(`  关注中: ${user.following}`);
    console.log(`  主要语言: ${user.top_languages.join(', ')}`);
  } catch (error) {
    logger.error({ error }, '获取用户信息失败');
    process.exit(1);
  }
}

export async function userNamespaceCommand(): Promise<void> {
  try {
    const client = new GitcodeClient();
    const namespace = await client.user.getNamespace();

    console.log('用户命名空间:');
    console.log(`  ID: ${namespace.id}`);
    console.log(`  路径: ${namespace.path}`);
    console.log(`  名称: ${namespace.name}`);
    console.log(`  主页: ${namespace.html_url}`);
    console.log(`  类型: ${namespace.type}`);
  } catch (error) {
    logger.error({ error }, '获取用户命名空间失败');
    process.exit(1);
  }
}

export function userCommand(): Command {
  const userProgram = new Command('user').description('User commands');

  userProgram.command('show').description('Show current user information').action(userShowCommand);
  userProgram.command('namespace').description('Show user namespace').action(userNamespaceCommand);

  return userProgram;
}
