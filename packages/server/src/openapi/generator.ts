import { generateOpenApi } from '@ts-rest/open-api';
import { contract } from '../contracts/index.js';

export function generateOpenAPISpec() {
  const openApiDocument = generateOpenApi(contract, {
    info: {
      title: 'GitCode Actions Server API',
      version: '0.1.0',
      description: `Express 后端服务，用于管理 GitCode 仓库的 Pull Requests 和 Issues

## 认证说明

所有仓库相关的 API 都需要提供 GitCode Token 进行认证。

**生产环境**：必须在请求头中提供有效的 GitCode Token

**开发环境**：如果未提供 Token，将使用服务器配置的默认 Token（如果有）

### 如何提供 Token

支持以下三种方式之一：
1. \`X-GitCode-Token\` 请求头
2. \`Authorization: Bearer <token>\` 请求头
3. \`X-Auth-Token\` 请求头

## API 设计

本 API 遵循 RESTful 设计规范：
- 使用标准 HTTP 方法（GET, POST, PATCH, PUT, DELETE）
- 资源使用名词复数形式
- 路径参数表示资源层级关系
- 查询参数用于过滤和分页`,
      contact: {
        name: 'GitCode Actions',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: '本地开发服务器' },
      { url: '/', description: '相对路径' },
    ],
    components: {
      securitySchemes: {
        GitCodeToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-GitCode-Token',
          description: 'GitCode API Token',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Token',
          description: 'GitCode API Token (使用 Bearer 格式)',
        },
      },
    },
  });

  return openApiDocument;
}

// CLI 执行时生成文件
async function main() {
  const { writeFileSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const yaml = await import('yaml');

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const spec = generateOpenAPISpec();
  const outputPath = join(__dirname, '..', 'swagger.yaml');
  writeFileSync(outputPath, yaml.stringify(spec), 'utf8');
  console.log(`✅ OpenAPI spec generated: ${outputPath}`);
}

// 检查是否直接执行
if (process.argv[1]?.includes('generator')) {
  main().catch(console.error);
}
