import { describe, it, expect } from 'vitest';
import { isHttpError, type HttpError } from '../../../client/http-error.js';

describe('isHttpError', () => {
  describe('应该返回 true', () => {
    it('对带 response 属性的 Error', () => {
      const error = new Error('HTTP Error') as HttpError;
      error.response = { statusCode: 404 };

      expect(isHttpError(error)).toBe(true);
    });

    it('对带完整 response 信息的 Error', () => {
      const error = new Error('Rate limited') as HttpError;
      error.response = {
        statusCode: 429,
        headers: { 'retry-after': '60' },
      };

      expect(isHttpError(error)).toBe(true);
    });

    it('对 response.statusCode 为 0 的 Error', () => {
      const error = new Error('Network error') as HttpError;
      error.response = { statusCode: 0 };

      expect(isHttpError(error)).toBe(true);
    });
  });

  describe('应该返回 false', () => {
    it('对普通 Error', () => {
      const error = new Error('Something went wrong');

      expect(isHttpError(error)).toBe(false);
    });

    it('对没有 response 属性的自定义 Error', () => {
      class CustomError extends Error {
        code = 'CUSTOM_ERROR';
      }
      const error = new CustomError('Custom error');

      expect(isHttpError(error)).toBe(false);
    });

    it('对非 Error 对象', () => {
      const notError = { message: 'Not an error', response: { statusCode: 500 } };

      expect(isHttpError(notError)).toBe(false);
    });

    it('对字符串', () => {
      expect(isHttpError('error string')).toBe(false);
    });

    it('对数字', () => {
      expect(isHttpError(404)).toBe(false);
    });

    it('对 null', () => {
      expect(isHttpError(null)).toBe(false);
    });

    it('对 undefined', () => {
      expect(isHttpError(undefined)).toBe(false);
    });

    it('对空对象', () => {
      expect(isHttpError({})).toBe(false);
    });

    it('对数组', () => {
      expect(isHttpError([1, 2, 3])).toBe(false);
    });
  });

  describe('类型守卫功能', () => {
    it('应该正确缩窄类型', () => {
      const error: unknown = new Error('HTTP Error');
      (error as HttpError).response = { statusCode: 404 };

      if (isHttpError(error)) {
        // 在此分支内，error 应该被推断为 HttpError 类型
        expect(error.response?.statusCode).toBe(404);
        expect(error.message).toBe('HTTP Error');
      }
    });

    it('应该能安全访问 response 属性', () => {
      const error = new Error('Rate limited') as HttpError;
      error.response = {
        statusCode: 429,
        headers: { 'retry-after': '60' },
      };

      if (isHttpError(error)) {
        expect(error.response?.statusCode).toBe(429);
        expect(error.response?.headers?.['retry-after']).toBe('60');
      }
    });
  });
});
