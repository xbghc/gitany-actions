import { GitcodeClient } from '@gitany/gitcode';
import { createLogger } from '@gitany/shared';

const logger = createLogger('@gitany/cli');

export async function withClient(
  fn: (client: GitcodeClient) => Promise<void>,
  errorMessage = 'Gitcode client operation failed',
): Promise<void> {
  try {
    const client = new GitcodeClient();
    await fn(client);
  } catch (error) {
    logger.error({ error }, errorMessage);
    process.exit(1);
  }
}
