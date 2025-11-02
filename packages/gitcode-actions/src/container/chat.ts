import type Docker from 'dockerode';
import { collectForwardEnv, docker, logger } from './shared.js';
import { prepareImage } from './prepare-image.js';
import { getDevContainer } from './get-dev-container.js';
import { createWorkspaceContainer } from './create-workspace-container.js';
import { cloneRepo } from './clone-repo.js';
import { verifySha } from './verify-sha.js';
import { checkoutSha } from './checkout-sha.js';
import { installDependencies } from './install-dependencies.js';
import { installAnthropicSdk } from './install-sdk.js';
import { createApiCallScript } from './call-anthropic.js';
import { executeStep } from './execute-step.js';

export interface ChatOptions {
  /** Optional existing container to use. */
  container?: Docker.Container;
  /** Target commit SHA or branch name. Defaults to 'dev'. */
  sha?: string;
  /** Node.js version for created container. Defaults to '18'. */
  nodeVersion?: string;
  /** Keep the container after completion when created internally. */
  keepContainer?: boolean;
  /** Enable verbose logging. */
  verbose?: boolean;
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
  const verbose = options.verbose ?? false;
  let keepContainer = options.keepContainer ?? false;
  const model = options.model ?? 'claude-sonnet-4-5-20250929';
  const maxTokens = options.maxTokens ?? 8000;
  const temperature = options.temperature;
  const log = logger.child({ scope: 'core:container', func: 'chat', sha });

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
  if (!container && sha === 'dev') {
    container = await getDevContainer();
    if (container) {
      log.debug(' reusing dev container');
    }
  }
  const createdContainer = !container;

  try {
    if (!container) {
      const image = `node:${nodeVersion}`;
      await prepareImage({ docker, image, verbose, log });

      const labels: Record<string, string> = {};
      if (sha === 'dev') {
        labels['gitcode.branch'] = 'dev';
        keepContainer = true;
      }

      container = await createWorkspaceContainer({
        docker,
        image,
        env: [`REPO_URL=${repoUrl}`, `TARGET_SHA=${sha}`, ...sharedStepEnv],
        log,
        labels,
        repoUrl: repoUrl,
        branch: sha,
        reusable: keepContainer,
      });
      const clone = await cloneRepo({ container, log, verbose });
      if (!clone.success) return { success: false, error: clone.output };
      const verify = await verifySha({ container, log, verbose });
      if (!verify.success) return { success: false, error: verify.output };
      const checkout = await checkoutSha({ container, log, verbose });
      if (!checkout.success) return { success: false, error: checkout.output };
    }

    const installDeps = await installDependencies({ container, log, verbose, env: sharedStepEnv });
    if (!installDeps.success) return { success: false, error: installDeps.output };

    // 安装 Anthropic SDK
    const installSdk = await installAnthropicSdk({ container, log, verbose, env: sharedStepEnv });
    if (!installSdk.success) return { success: false, error: installSdk.output };

    // 创建 API 调用脚本
    await createApiCallScript({
      container,
      prompt: question,
      model,
      maxTokens,
      temperature,
    });

    // 收集 ANTHROPIC_ 环境变量
    const anthropicEnv: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('ANTHROPIC_') && typeof value === 'string') {
        anthropicEnv.push(`${key}=${value}`);
      }
    }

    const chatEnv = [...anthropicEnv, ...forwardedEnv];

    // 执行 API 调用脚本
    const chatStep = await executeStep({
      container,
      name: 'call-anthropic-api',
      script: 'cd /tmp/workspace && node /tmp/call-anthropic.mjs 2>&1',
      env: chatEnv,
      log,
      verbose,
    });

    if (!chatStep.success) {
      return { success: false, error: chatStep.output };
    }

    // 解析 JSON 输出
    try {
      const parsed = JSON.parse(chatStep.output);
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
      return { success: true, output: chatStep.output };
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
