import type Docker from 'dockerode';
import { collectForwardEnv, docker } from '../container/shared.js';
import { prepareImage } from '../container/prepare-image.js';
import { createRawContainer } from '../container/lifecycle.js';
import { verifySha } from '../executor/verify-sha.js';
import { createApiCallScript } from './call-anthropic.js';
import {
  executor,
  StepExecutionError as ContainerStepExecutionError,
} from '../executor/container-executor.js';

export interface ChatOptions {
  /** Optional existing container to use. */
  container?: Docker.Container;
  /** Target commit SHA or branch name. Defaults to 'dev'. */
  sha?: string;
  /** Node.js version for created container. Defaults to '18'. */
  nodeVersion?: string;
  /** Keep the container after completion when created internally. */
  keepContainer?: boolean;
  /** Override npm registry for installs. Falls back to env then mirror. */
  npmRegistry?: string;
  /** Override pnpm registry for installs. Falls back to env then mirror. */
  pnpmRegistry?: string;
  /** Claude model to use. Defaults to 'claude-sonnet-4-5-20250929'. */
  model?: string;
  /** Maximum tokens for the response. Defaults to 8000. */
  maxTokens?: number;
  /** Temperature for the response. Optional. */
  temperature?: number;
}

export interface ChatResult {
  /** Whether the conversation succeeded. */
  success: boolean;
  /** Claude's response when successful. */
  output?: string;
  /** Error output when failed. */
  error?: string;
  /** Metadata about the API call. */
  metadata?: {
    model?: string;
    tokensUsed?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export async function chat(
  repoUrl: string,
  question: string,
  options: ChatOptions = {},
): Promise<ChatResult> {
  const sha = options.sha ?? 'dev';
  const nodeVersion = options.nodeVersion ?? '18';
  let keepContainer = options.keepContainer ?? false;
  const model = options.model ?? 'claude-sonnet-4-5-20250929';
  const maxTokens = options.maxTokens ?? 8000;
  const temperature = options.temperature;

  const defaultRegistry = 'https://registry.npmmirror.com';
  const npmRegistry = options.npmRegistry ?? process.env.NPM_CONFIG_REGISTRY ?? defaultRegistry;
  const pnpmRegistry = options.pnpmRegistry ?? process.env.PNPM_CONFIG_REGISTRY ?? defaultRegistry;
  const registryEnv = [
    `NPM_CONFIG_REGISTRY=${npmRegistry}`,
    `PNPM_CONFIG_REGISTRY=${pnpmRegistry}`,
  ];

  const forwardedEnv = collectForwardEnv();
  const sharedStepEnv = [...registryEnv, ...forwardedEnv];

  let container = options.container;
  const createdContainer = !container;

  try {
    if (!container) {
      const image = `node:${nodeVersion}`;
      await prepareImage({ docker, image });

      const labels: Record<string, string> = {};
      if (sha === 'dev') {
        labels['gitcode.branch'] = 'dev';
        keepContainer = true;
      }

      container = await createRawContainer({
        image,
        env: [`REPO_URL=${repoUrl}`, `TARGET_SHA=${sha}`, ...sharedStepEnv],
        labels,
      });

      try {
        await executor(container)
          .execute('rm -rf /tmp/workspace', { name: '清理工作空间' })
          .execute('git clone "$REPO_URL" /tmp/workspace 2>&1', { name: '克隆仓库' })
          .execute('git -C /tmp/workspace checkout "$TARGET_SHA" 2>&1', { name: '检出 SHA' });
      } catch (error) {
        if (error instanceof ContainerStepExecutionError) {
          return { success: false, error: error.output };
        }
        throw error;
      }

      const verify = await verifySha({ container });
      if (!verify.success) return { success: false, error: verify.output };
    }

    try {
      await executor(container, { env: sharedStepEnv }).execute(
        'cd /tmp/workspace && npm install --no-save @anthropic-ai/sdk 2>&1',
        {
          name: 'Install Anthropic SDK',
        },
      );
    } catch (error) {
      if (error instanceof ContainerStepExecutionError) {
        return { success: false, error: error.output };
      }
      throw error;
    }

    await createApiCallScript({
      container,
      prompt: question,
      model,
      maxTokens,
      temperature,
    });

    const anthropicEnv: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('ANTHROPIC_') && typeof value === 'string') {
        anthropicEnv.push(`${key}=${value}`);
      }
    }

    const chatEnv = [...anthropicEnv, ...forwardedEnv];

    let chatOutput: string;
    try {
      const chatResult = await executor(container, { env: chatEnv }).execute(
        'cd /tmp/workspace && node /tmp/call-anthropic.mjs 2>&1',
        {
          name: 'call-anthropic-api',
        },
      );
      chatOutput = chatResult.steps[0].output;
    } catch (error) {
      if (error instanceof ContainerStepExecutionError) {
        return { success: false, error: error.output };
      }
      throw error;
    }

    try {
      const parsed = JSON.parse(chatOutput);
      if (parsed.success) {
        return {
          success: true,
          output: parsed.output,
          metadata: parsed.metadata,
        };
      } else {
        return { success: false, error: parsed.error };
      }
    } catch {
      // 如果解析失败，返回原始输出（向后兼容）
      return { success: true, output: chatOutput };
    }
  } finally {
    if (createdContainer && container && !keepContainer) {
      try {
        await container.remove({ force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
