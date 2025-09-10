import { GitcodeAuth } from '@gitany/gitcode';
import readline from 'readline';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

export async function authCommand(args: string[]): Promise<void> {
  const sub = args[0];
  const auth = new GitcodeAuth();

  switch (sub) {
    case 'login': {
      const rest = args.slice(1);
      const tokenArg = parseFlag(rest, '--token');
      const token = tokenArg || (await ask('Paste your GitCode token: '));
      if (!token) {
        console.error('No token provided.');
        process.exitCode = 1;
        return;
      }
      await auth.login(token.trim());
      const status = await auth.status();
      if (status.authenticated) {
        console.log('Logged in to GitCode.');
        if (status.user) console.log(JSON.stringify(status.user, null, 2));
      } else {
        console.log('Token saved, but could not verify via API (offline or invalid).');
      }
      return;
    }
    case 'status': {
      const status = await auth.status();
      console.log(JSON.stringify(status, null, 2));
      return;
    }
    case 'logout': {
      await auth.logout();
      console.log('Logged out from GitCode (token removed).');
      return;
    }
    case 'oauth-exchange': {
      const rest = args.slice(1);
      const code = parseFlag(rest, '--code');
      const clientId = parseFlag(rest, '--client-id');
      const clientSecret = parseFlag(rest, '--client-secret');
      const baseArg = parseFlag(rest, '--base');
      if (!code || !clientId || !clientSecret) {
        console.error('Usage: gitcode auth oauth-exchange --code <code> --client-id <id> --client-secret <secret> [--base <api-base>]');
        process.exitCode = 1;
        return;
      }
      const { oauthExchangeAuthorizationCode } = await import('./oauth.js');
      const token = await oauthExchangeAuthorizationCode({ code, clientId, clientSecret});
      await auth.login(token.access_token, 'bearer');
      console.log('Token stored.');
      return;
    }
    default: {
      printAuthHelp();
    }
  }
}

function parseFlag(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  const eq = args.find((a) => a.startsWith(name + '='));
  if (eq) return eq.split('=', 2)[1];
  return null;
}

export function printAuthHelp() {
  console.log(`Usage: gitcode auth <command> [options]\n\nCommands:\n  login             Save a GitCode token\n  status            Show auth status (GET /user)\n  logout            Remove saved token\n  oauth-exchange    Exchange OAuth code for token and save\n\nLogin Options:\n  --token <token>         Personal access token or OAuth token\n\nOAuth Exchange Options:\n  --code <code>           Authorization code\n  --client-id <id>        OAuth client id\n  --client-secret <sec>   OAuth client secret\n  --base <api-base>       Optional API base (default: https://gitcode.com/api/v5)`);
}
