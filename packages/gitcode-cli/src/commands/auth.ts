import { input } from '@inquirer/prompts';
import { GitCodeClient, OAuthClient } from '@xbghc/gitcode-api';
import { Command } from 'commander';
import open from 'open';
import {
  getAuthType,
  getConfigPath,
  getOAuthToken,
  getToken,
  removeOAuthToken,
  removeToken,
  saveOAuthToken,
  saveToken,
} from '../utils/config.js';

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
      const authType = getAuthType();

      if (authType === 'none') {
        console.log('Not authenticated');
        console.log('\nOptions:');
        console.log('  1. OAuth login: gitcode auth login');
        console.log('  2. Personal token: gitcode auth set-token <token>');
        return;
      }

      if (authType === 'oauth') {
        const oauthData = getOAuthToken();
        if (oauthData) {
          const maskedToken = `${oauthData.accessToken.slice(0, 4)}...${oauthData.accessToken.slice(-4)}`;
          console.log(`Authenticated: ${maskedToken}`);
          console.log('Type: OAuth');
          console.log(`Scope: ${oauthData.scope}`);

          const expiresDate = new Date(oauthData.expiresAt);
          const now = new Date();
          const isExpired = expiresDate <= now;

          if (isExpired) {
            console.log(`Expires: ${expiresDate.toLocaleString()} (expired)`);
            console.log('\nPlease run "gitcode auth login" to re-authenticate');
          } else {
            console.log(`Expires: ${expiresDate.toLocaleString()}`);
          }

          console.log(`Config file: ${getConfigPath()}`);
        }
      } else if (authType === 'token') {
        const token = getToken();
        if (token) {
          const maskedToken = `${token.slice(0, 4)}...${token.slice(-4)}`;
          console.log(`Authenticated: ${maskedToken}`);
          console.log('Type: Personal Access Token');
          if (process.env.GITCODE_TOKEN) {
            console.log('Source: Environment variable (GITCODE_TOKEN)');
          } else {
            console.log(`Source: Config file (${getConfigPath()})`);
          }
        }
      }
    });

  authProgram
    .command('login')
    .description('Login via OAuth 2.0 (browser flow)')
    .action(async () => {
      try {
        // 1. 检查环境变量配置
        const clientId = process.env.GITCODE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITCODE_OAUTH_CLIENT_SECRET;
        const redirectUri = process.env.GITCODE_OAUTH_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
          console.error('❌ 缺少 OAuth 配置');
          console.log('\n请设置以下环境变量:');
          console.log('  export GITCODE_OAUTH_CLIENT_ID=your_client_id');
          console.log('  export GITCODE_OAUTH_CLIENT_SECRET=your_client_secret');
          console.log('  export GITCODE_OAUTH_REDIRECT_URI=http://127.0.0.1:5173/oauth/callback');
          process.exit(1);
        }

        // 2. 创建 OAuth 客户端
        const oauth = new OAuthClient({
          clientId,
          clientSecret,
          redirectUri,
        });

        // 3. 生成授权 URL
        const { url } = oauth.generateAuthorizationUrl({
          scope: ['user', 'repo', 'pull_requests', 'issues'],
        });

        // 4. 打印说明
        console.log('\n┌─────────────────────────────────────────────────┐');
        console.log('│   GitCode OAuth 2.0 登录                       │');
        console.log('└─────────────────────────────────────────────────┘\n');

        console.log('📝 请按照以下步骤完成登录:\n');
        console.log('  1. 在浏览器中打开授权页面');
        console.log('  2. 点击"授权"按钮');
        console.log('  3. 复制显示的授权码');
        console.log('  4. 粘贴到下方输入框\n');

        console.log('授权 URL:');
        console.log(url);
        console.log('');

        // 5. 尝试自动打开浏览器
        try {
          await open(url);
          console.log('✓ 浏览器已打开\n');
        } catch {
          console.log('⚠ 无法自动打开浏览器，请手动复制上方 URL\n');
        }

        // 6. 等待用户输入授权码
        const code = await input({
          message: '请输入授权码:',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return '授权码不能为空';
            }
            return true;
          },
        });

        // 7. 显示处理中
        console.log('\n⏳ 正在获取 access token...');

        // 8. 交换 token
        const tokenResponse = await oauth.exchangeCodeForToken(code.trim());

        // 9. 保存到配置文件
        await saveOAuthToken({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: Date.now() + tokenResponse.expires_in * 1000,
          scope: tokenResponse.scope,
          tokenType: tokenResponse.token_type,
        });

        // 10. 验证登录
        console.log('⏳ 验证登录状态...');
        const client = new GitCodeClient();
        client.auth.configureOAuth({
          clientId,
          clientSecret,
          redirectUri,
        });
        client.auth.setOAuthToken(tokenResponse);
        const user = await client.user.getProfile();

        // 11. 显示成功消息
        console.log('\n✅ 登录成功！\n');
        console.log(`👤 用户: ${user.name} (@${user.login})`);
        console.log(`📧 邮箱: ${user.email || 'N/A'}`);

        const expiresDate = new Date(Date.now() + tokenResponse.expires_in * 1000);
        console.log(`⏰ 过期时间: ${expiresDate.toLocaleString()}`);
        console.log(`📁 配置文件: ${getConfigPath()}\n`);
      } catch (err) {
        console.error('\n❌ 登录失败');
        if (err instanceof Error) {
          console.error(`错误信息: ${err.message}`);
        }
        if (typeof err === 'object' && err !== null && 'code' in err) {
          console.error(`错误代码: ${err.code}`);
        }
        process.exit(1);
      }
    });

  authProgram
    .command('logout')
    .description('Logout and remove all authentication data')
    .action(async () => {
      try {
        const authType = getAuthType();

        if (authType === 'none') {
          console.log('未登录');
          return;
        }

        await removeToken();
        await removeOAuthToken();

        console.log('✓ 已登出');
        console.log(`Config file: ${getConfigPath()}`);
      } catch (err) {
        console.error('Failed to logout:', err);
        process.exit(1);
      }
    });

  return authProgram;
}
