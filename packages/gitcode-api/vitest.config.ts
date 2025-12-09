import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    // 全局 API（describe, it, expect 等）
    globals: true,

    // 测试文件匹配模式（支持 *.test.ts 和 *.e2e.ts）
    include: [
      '**/*.{test,spec}.?(c|m)[jt]s?(x)', // 默认模式（单元测试）
      '**/*.e2e.?(c|m)[jt]s?(x)', // E2E 测试模式
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.e2e.ts',
        'src/__tests__/**',
        'src/index.ts', // 仅做导出
      ],
    },

    testTimeout: 10000, // 单元测试 10 秒
    hookTimeout: 10000,

    // E2E 测试单独配置
    pool: 'threads', // 使用线程池（WSL2 下 forks 模式容易超时）
  },
});
