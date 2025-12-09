import { describe, it, expect } from 'vitest';
import { safeCall, isSuccess, isFailure, type SafeCallResult } from '../../../client/safe-call.js';
import { ApiValidationError } from '../../../client/errors.js';
import { z } from 'zod';

describe('safeCall', () => {
  describe('成功调用', () => {
    it('应该返回 success: true 和数据', async () => {
      const result = await safeCall(async () => {
        return { id: 1, name: 'test' };
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: 1, name: 'test' });
      }
    });

    it('应该处理异步函数', async () => {
      const result = await safeCall(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async result';
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('async result');
      }
    });

    it('应该处理返回 null 的函数', async () => {
      const result = await safeCall(async () => null);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('应该处理返回 undefined 的函数', async () => {
      const result = await safeCall(async () => undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('验证错误', () => {
    it('应该捕获 ApiValidationError 并返回 validation 类型', async () => {
      const schema = z.object({ id: z.number() });
      const zodError = schema.safeParse({ id: 'not a number' });

      const result = await safeCall(async () => {
        if (!zodError.success) {
          throw new ApiValidationError(zodError.error, {
            endpoint: '/test',
            method: 'GET',
          });
        }
        return zodError.data;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.validationError).toBeInstanceOf(ApiValidationError);
        expect(result.error.message).toBeDefined();
      }
    });

    it('验证错误应该包含详细信息', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });
      const zodError = schema.safeParse({ user: { name: 123 } });

      const result = await safeCall(async () => {
        if (!zodError.success) {
          throw new ApiValidationError(zodError.error, {
            endpoint: '/api/users',
            method: 'GET',
          });
        }
        return zodError.data;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.validationError?.context.endpoint).toBe('/api/users');
      }
    });
  });

  describe('HTTP 错误', () => {
    it('应该捕获 HTTP 错误并返回 http 类型', async () => {
      const httpError = Object.assign(new Error('Not Found'), {
        response: { statusCode: 404 },
      });

      const result = await safeCall(async () => {
        throw httpError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('http');
        expect(result.error.statusCode).toBe(404);
      }
    });

    it('应该处理 401 未授权错误', async () => {
      const httpError = Object.assign(new Error('Unauthorized'), {
        response: { statusCode: 401 },
      });

      const result = await safeCall(async () => {
        throw httpError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('http');
        expect(result.error.statusCode).toBe(401);
      }
    });

    it('应该处理 429 限流错误', async () => {
      const httpError = Object.assign(new Error('Too Many Requests'), {
        response: { statusCode: 429 },
      });

      const result = await safeCall(async () => {
        throw httpError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('http');
        expect(result.error.statusCode).toBe(429);
      }
    });

    it('应该处理 500 服务器错误', async () => {
      const httpError = Object.assign(new Error('Internal Server Error'), {
        response: { statusCode: 500 },
      });

      const result = await safeCall(async () => {
        throw httpError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('http');
        expect(result.error.statusCode).toBe(500);
      }
    });
  });

  describe('网络错误', () => {
    it('应该捕获 ECONNREFUSED 错误', async () => {
      const networkError = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      });

      const result = await safeCall(async () => {
        throw networkError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('network');
        expect(result.error.message).toContain('ECONNREFUSED');
      }
    });

    it('应该捕获 ETIMEDOUT 错误', async () => {
      const networkError = Object.assign(new Error('connect ETIMEDOUT'), {
        code: 'ETIMEDOUT',
      });

      const result = await safeCall(async () => {
        throw networkError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('network');
        expect(result.error.message).toContain('ETIMEDOUT');
      }
    });

    it('应该捕获 ENOTFOUND 错误', async () => {
      const networkError = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
        code: 'ENOTFOUND',
      });

      const result = await safeCall(async () => {
        throw networkError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('network');
        expect(result.error.message).toContain('ENOTFOUND');
      }
    });
  });

  describe('未知错误', () => {
    it('应该捕获普通 Error', async () => {
      const result = await safeCall(async () => {
        throw new Error('Something went wrong');
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('unknown');
        expect(result.error.message).toBe('Something went wrong');
      }
    });

    it('应该捕获非 Error 类型的抛出', async () => {
      const result = await safeCall(async () => {
        throw 'string error';
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('unknown');
        expect(result.error.message).toBe('string error');
      }
    });

    it('应该捕获数字类型的抛出', async () => {
      const result = await safeCall(async () => {
        throw 42;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('unknown');
        expect(result.error.message).toBe('42');
      }
    });
  });

  describe('错误对象应该保留原始 cause', () => {
    it('验证错误应该保留原始 ApiValidationError', async () => {
      const schema = z.object({ id: z.number() });
      const zodError = schema.safeParse({ id: 'invalid' });
      const originalError = new ApiValidationError(zodError.error!, {
        endpoint: '/test',
      });

      const result = await safeCall(async () => {
        throw originalError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.cause).toBe(originalError);
      }
    });

    it('HTTP 错误应该保留原始错误', async () => {
      const originalError = Object.assign(new Error('Not Found'), {
        response: { statusCode: 404 },
      });

      const result = await safeCall(async () => {
        throw originalError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.cause).toBe(originalError);
      }
    });
  });
});

describe('isSuccess', () => {
  it('应该正确识别成功结果', () => {
    const successResult: SafeCallResult<number> = { success: true, data: 42 };
    expect(isSuccess(successResult)).toBe(true);
  });

  it('应该正确识别失败结果', () => {
    const failureResult: SafeCallResult<number> = {
      success: false,
      error: {
        type: 'unknown',
        message: 'error',
        cause: new Error('error'),
      },
    };
    expect(isSuccess(failureResult)).toBe(false);
  });

  it('作为类型守卫应该工作', () => {
    const result: SafeCallResult<{ name: string }> = { success: true, data: { name: 'test' } };

    if (isSuccess(result)) {
      // TypeScript 应该知道 result.data 是 { name: string }
      const name: string = result.data.name;
      expect(name).toBe('test');
    }
  });
});

describe('isFailure', () => {
  it('应该正确识别失败结果', () => {
    const failureResult: SafeCallResult<number> = {
      success: false,
      error: {
        type: 'unknown',
        message: 'error',
        cause: new Error('error'),
      },
    };
    expect(isFailure(failureResult)).toBe(true);
  });

  it('应该正确识别成功结果', () => {
    const successResult: SafeCallResult<number> = { success: true, data: 42 };
    expect(isFailure(successResult)).toBe(false);
  });

  it('作为类型守卫应该工作', () => {
    const result: SafeCallResult<number> = {
      success: false,
      error: {
        type: 'validation',
        message: 'validation error',
        cause: new Error('error'),
      },
    };

    if (isFailure(result)) {
      // TypeScript 应该知道 result.error 存在
      expect(result.error.type).toBe('validation');
    }
  });
});
