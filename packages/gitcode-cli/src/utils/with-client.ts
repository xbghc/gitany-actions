import { GitcodeClient } from '@xbghc/gitcode-api';
import { getToken } from './config.js';

type WithClientErrorHandler = string | ((error: unknown) => void | string | Promise<void | string>);

interface WithClientOptions {
  onNotFound?: (error: Error) => void;
}

export async function withClient(
  fn: (client: GitcodeClient) => Promise<void>,
  errorHandler: WithClientErrorHandler = 'Gitcode client operation failed',
  options: WithClientOptions = {},
): Promise<void> {
  try {
    // 从配置文件或环境变量获取 token
    const token = getToken();
    const client = new GitcodeClient(token);
    await fn(client);
  } catch (error) {
    if (error instanceof Error && /\b404\b/.test(error.message)) {
      if (options.onNotFound) {
        options.onNotFound(error);
        return;
      }
    }

    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof errorHandler === 'string') {
      message = errorHandler;
    } else {
      message = 'Gitcode client operation failed';
    }

    if (typeof errorHandler === 'function') {
      try {
        const result = await errorHandler(error);
        if (typeof result === 'string' && result.trim().length > 0) {
          message = result;
        }
      } catch (handlerError) {
        console.error('withClient error handler threw:', handlerError);
      }
    }

    console.error(message, error);
    process.exit(1);
  }
}
