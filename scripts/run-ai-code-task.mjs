import { GitcodeClient } from '@gitany/gitcode';
import { code } from '@gitany/core';
import { createLogger } from '@gitany/shared';

const logger = createLogger('run-ai-code-task');

async function main() {
  const args = process.argv.slice(2);
  const repoUrlIndex = args.indexOf('--repo-url');
  const instructionIndex = args.indexOf('--instruction');
  const baseShaIndex = args.indexOf('--base-sha');

  if (repoUrlIndex === -1 || instructionIndex === -1 || baseShaIndex === -1) {
    console.error('Usage: node scripts/run-ai-code-task.mjs --repo-url <url> --instruction <text> --base-sha <sha>');
    process.exit(1);
  }

  const repoUrl = args[repoUrlIndex + 1];
  const instruction = args[instructionIndex + 1];
  const baseSha = args[baseShaIndex + 1];

  if (!repoUrl || !instruction || !baseSha) {
    console.error('Missing value for one of the arguments.');
    process.exit(1);
  }

  logger.info({ repoUrl, instruction, baseSha }, 'starting code task');

  const client = new GitcodeClient();

  try {
    const result = await code(client, repoUrl, instruction, { baseSha, verbose: true });

    if (result.success) {
      logger.info(`task succeeded. pull request url: ${result.pullRequestUrl}`);
      console.log(`\n✅ Pull Request created: ${result.pullRequestUrl}`);
    } else {
      logger.error(`task failed: ${result.error}`);
      console.error(`\n❌ Task failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error({ err }, `an unexpected error occurred: ${error}`);
    console.error(`\n❌ An unexpected error occurred: ${error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Script failed unexpectedly', err);
  process.exit(1);
});
