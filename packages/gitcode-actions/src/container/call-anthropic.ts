import type Docker from 'dockerode';

export interface CreateApiCallScriptOptions {
  container: Docker.Container;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * 在容器中创建 API 调用脚本
 */
export async function createApiCallScript(
  options: CreateApiCallScriptOptions,
): Promise<void> {
  const {
    container,
    prompt,
    model = 'claude-sonnet-4-5-20250929',
    maxTokens = 8000,
    temperature,
  } = options;

  const scriptContent = generateApiCallScript(prompt, {
    model,
    maxTokens,
    temperature,
  });

  await writeStringToContainer(container, '/tmp/call-anthropic.mjs', scriptContent);
}

/**
 * 生成 API 调用脚本内容
 */
function generateApiCallScript(
  prompt: string,
  options: {
    model: string;
    maxTokens: number;
    temperature?: number;
  },
): string {
  const { model, maxTokens, temperature } = options;

  // 转义 prompt，防止注入
  const escapedPrompt = JSON.stringify(prompt);
  const temperatureLine = temperature !== undefined ? `temperature: ${temperature},` : '';

  return `import Anthropic from '@anthropic-ai/sdk';

async function main() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: '${model}',
      max_tokens: ${maxTokens},
      ${temperatureLine}
      messages: [
        {
          role: 'user',
          content: ${escapedPrompt}
        }
      ]
    });

    // 提取文本内容
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in API response');
    }

    // 输出 JSON 格式结果
    const result = {
      success: true,
      output: textContent.text,
      metadata: {
        model: response.model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    };

    console.log(JSON.stringify(result));

  } catch (error) {
    const result = {
      success: false,
      error: error.message || String(error)
    };
    console.error(JSON.stringify(result));
    process.exit(1);
  }
}

main();
`;
}

/**
 * 将字符串内容写入容器文件
 * 使用 cat 命令和 heredoc 实现
 */
async function writeStringToContainer(
  container: Docker.Container,
  filePath: string,
  content: string,
): Promise<void> {
  // 使用 heredoc 写入文件（单引号包裹的 heredoc 不解释变量，无需转义）
  const exec = await container.exec({
    Cmd: ['sh', '-c', `cat > '${filePath}' <<'GITCODE_EOF'\n${content}\nGITCODE_EOF`],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, stdin: false });

  await new Promise<void>((resolve, reject) => {
    stream.on('end', async () => {
      try {
        const info = await exec.inspect();
        if (info.ExitCode === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to write file: exit code ${info.ExitCode}`));
        }
      } catch (error) {
        reject(error);
      }
    });
    stream.on('error', reject);
  });
}
