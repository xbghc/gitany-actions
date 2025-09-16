import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

type WithClientErrorHandler =
  | string
  | ((error: unknown) => void | string | Promise<void | string>);

export async function withClient(
  fn: (client: GitcodeClient) => Promise<void>,
  errorHandler: WithClientErrorHandler = 'Gitcode client operation failed',
): Promise<void> {
  try {
    const client = new GitcodeClient();
    await fn(client);
  } catch (error) {
    let message = 'Gitcode client operation failed';

    if (typeof errorHandler === 'function') {
      try {
        const result = await errorHandler(error);
        if (typeof result === 'string' && result.trim().length > 0) {
          message = result;
        }
      } catch (handlerError) {
        logger.error({ error: handlerError }, 'withClient error handler threw');
      }
    } else if (typeof errorHandler === 'string' && errorHandler.trim().length > 0) {
      message = errorHandler;
    }

    logger.error({ error }, message);
    process.exit(1);
  }
}
