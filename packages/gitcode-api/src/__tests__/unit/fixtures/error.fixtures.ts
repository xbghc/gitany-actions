/**
 * 错误相关测试数据 Fixtures
 */

import { z } from 'zod';

/**
 * 创建 Zod 验证错误
 *
 * @param schema - Zod schema
 * @param invalidData - 无效数据
 * @returns ZodError 实例
 */
export function createZodError<T>(schema: z.ZodType<T>, invalidData: unknown): z.ZodError {
  const result = schema.safeParse(invalidData);
  if (result.success) {
    throw new Error('Expected validation to fail but it succeeded');
  }
  return result.error;
}

/**
 * 简单的测试 Schema
 */
export const simpleSchema = z.object({
  id: z.number(),
  name: z.string(),
  active: z.boolean().optional(),
});

/**
 * 嵌套的测试 Schema
 */
export const nestedSchema = z.object({
  user: z.object({
    id: z.number(),
    login: z.string(),
    profile: z.object({
      email: z.string().email(),
      age: z.number().min(0),
    }),
  }),
  items: z.array(
    z.object({
      id: z.number(),
      value: z.string(),
    }),
  ),
});

/**
 * HTTP 429 错误响应
 */
export const httpError429Response = {
  statusCode: 429,
  headers: { 'retry-after': '60' },
};

/**
 * HTTP 404 错误响应
 */
export const httpError404Response = {
  statusCode: 404,
  headers: {},
};

/**
 * HTTP 401 错误响应
 */
export const httpError401Response = {
  statusCode: 401,
  headers: {},
};

/**
 * HTTP 500 错误响应
 */
export const httpError500Response = {
  statusCode: 500,
  headers: {},
};

/**
 * 有效的简单数据
 */
export const validSimpleData = {
  id: 1,
  name: 'Test',
  active: true,
};

/**
 * 无效的简单数据：id 类型错误
 */
export const invalidSimpleData_wrongIdType = {
  id: 'not-a-number',
  name: 'Test',
};

/**
 * 无效的简单数据：缺少必需字段
 */
export const invalidSimpleData_missingName = {
  id: 1,
};

/**
 * 有效的嵌套数据
 */
export const validNestedData = {
  user: {
    id: 1,
    login: 'testuser',
    profile: {
      email: 'test@example.com',
      age: 25,
    },
  },
  items: [
    { id: 1, value: 'item1' },
    { id: 2, value: 'item2' },
  ],
};

/**
 * 无效的嵌套数据：email 格式错误
 */
export const invalidNestedData_wrongEmail = {
  user: {
    id: 1,
    login: 'testuser',
    profile: {
      email: 'invalid-email',
      age: 25,
    },
  },
  items: [],
};

/**
 * 无效的嵌套数据：age 为负数
 */
export const invalidNestedData_negativeAge = {
  user: {
    id: 1,
    login: 'testuser',
    profile: {
      email: 'test@example.com',
      age: -5,
    },
  },
  items: [],
};
