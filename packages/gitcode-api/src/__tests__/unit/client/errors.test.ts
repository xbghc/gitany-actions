import { describe, it, expect } from 'vitest';
import { ApiValidationError } from '../../../client/errors.js';
import {
  createZodError,
  simpleSchema,
  nestedSchema,
  invalidSimpleData_wrongIdType,
  invalidSimpleData_missingName,
  invalidNestedData_wrongEmail,
  invalidNestedData_negativeAge,
  validNestedData,
} from '../fixtures/error.fixtures.js';

describe('ApiValidationError', () => {
  describe('构造函数', () => {
    it('应该生成包含 endpoint 的错误消息', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'repos/owner/repo/pulls',
      });

      expect(error.message).toContain('repos/owner/repo/pulls');
    });

    it('应该生成包含 method 的错误消息', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'repos/owner/repo/pulls',
        method: 'POST',
      });

      expect(error.message).toContain('POST');
    });

    it('应该使用默认 GET 方法（未提供 method 时）', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'repos/owner/repo/pulls',
      });

      expect(error.message).toContain('GET');
    });

    it('应该保存 zodError 引用', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      expect(error.zodError).toBe(zodError);
    });

    it('应该保存 context 信息', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const context = {
        endpoint: 'test/endpoint',
        method: 'POST',
        params: { state: 'open' },
      };
      const error = new ApiValidationError(zodError, context);

      expect(error.context.endpoint).toBe('test/endpoint');
      expect(error.context.method).toBe('POST');
      expect(error.context.params).toEqual({ state: 'open' });
    });

    it('应该设置正确的 name 属性', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      expect(error.name).toBe('ApiValidationError');
    });
  });

  describe('错误消息格式化', () => {
    it('应该格式化类型错误', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidSimpleData_wrongIdType,
      });

      expect(error.message).toContain('id');
      expect(error.message).toContain('实际值');
    });

    it('应该格式化缺少字段错误', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_missingName);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidSimpleData_missingName,
      });

      expect(error.message).toContain('name');
    });

    it('应该格式化嵌套路径错误', () => {
      const zodError = createZodError(nestedSchema, invalidNestedData_wrongEmail);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidNestedData_wrongEmail,
      });

      expect(error.message).toContain('user.profile.email');
    });

    it('应该显示字符串实际值（带引号）', () => {
      const zodError = createZodError(nestedSchema, invalidNestedData_wrongEmail);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidNestedData_wrongEmail,
      });

      expect(error.message).toContain('"invalid-email"');
    });

    it('应该显示数字实际值', () => {
      const zodError = createZodError(nestedSchema, invalidNestedData_negativeAge);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidNestedData_negativeAge,
      });

      expect(error.message).toContain('-5');
    });

    it('应该截断长字符串', () => {
      const longString = 'a'.repeat(100);
      const invalidData = { id: longString, name: 'test' };
      const zodError = createZodError(simpleSchema, invalidData);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidData,
      });

      // 字符串应该被截断并添加 ...
      expect(error.message).toContain('...');
    });

    it('应该格式化数组实际值（长度 <= 3）', () => {
      const invalidData = {
        user: validNestedData.user,
        items: 'not-an-array',
      };
      const zodError = createZodError(nestedSchema, invalidData);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        data: invalidData,
      });

      expect(error.message).toContain('items');
    });
  });

  describe('getFieldErrors()', () => {
    it('应该返回扁平化的字段错误映射', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const fieldErrors = error.getFieldErrors();

      expect(fieldErrors).toBeDefined();
      expect(typeof fieldErrors).toBe('object');
    });

    it('应该处理多个字段错误', () => {
      const invalidData = {}; // 缺少 id 和 name
      const zodError = createZodError(simpleSchema, invalidData);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const fieldErrors = error.getFieldErrors();

      // 应该至少有 id 和 name 的错误
      expect(Object.keys(fieldErrors).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getSummary()', () => {
    it('应该返回单个错误的简洁摘要', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const summary = error.getSummary();

      expect(summary).toContain('id');
      expect(typeof summary).toBe('string');
    });

    it('应该返回多个错误的计数摘要', () => {
      const invalidData = {}; // 缺少多个字段
      const zodError = createZodError(simpleSchema, invalidData);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const summary = error.getSummary();

      expect(summary).toContain('validation errors');
    });

    it('应该处理 root 级别的错误', () => {
      const zodError = createZodError(simpleSchema, 'not-an-object');
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const summary = error.getSummary();

      expect(typeof summary).toBe('string');
    });
  });

  describe('getIssues()', () => {
    it('应该返回所有错误的详细列表', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const issues = error.getIssues();

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('每个 issue 应该包含 path、message、code', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const issues = error.getIssues();

      issues.forEach((issue) => {
        expect(issue).toHaveProperty('path');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('code');
      });
    });

    it('path 应该是字符串格式', () => {
      const zodError = createZodError(nestedSchema, invalidNestedData_wrongEmail);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const issues = error.getIssues();

      issues.forEach((issue) => {
        expect(typeof issue.path).toBe('string');
      });
    });
  });

  describe('toJSON()', () => {
    it('应该返回可序列化的对象', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        method: 'POST',
      });

      const json = error.toJSON();

      // 应该能被 JSON.stringify 序列化
      expect(() => JSON.stringify(json)).not.toThrow();
    });

    it('应该包含 name 属性', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const json = error.toJSON();

      expect(json.name).toBe('ApiValidationError');
    });

    it('应该包含 message 属性', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const json = error.toJSON();

      expect(json.message).toBeDefined();
      expect(typeof json.message).toBe('string');
    });

    it('应该包含 context 属性', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
        method: 'POST',
      });

      const json = error.toJSON();

      expect(json.context).toBeDefined();
      expect(json.context.endpoint).toBe('test/endpoint');
      expect(json.context.method).toBe('POST');
    });

    it('应该包含 issues 数组', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const json = error.toJSON();

      expect(Array.isArray(json.issues)).toBe(true);
    });

    it('应该包含 timestamp', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      const json = error.toJSON();

      expect(json.timestamp).toBeDefined();
      // 应该是 ISO 日期格式
      expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
    });
  });

  describe('继承和兼容性', () => {
    it('应该是 Error 的实例', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      expect(error).toBeInstanceOf(Error);
    });

    it('应该有堆栈跟踪', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);
      const error = new ApiValidationError(zodError, {
        endpoint: 'test/endpoint',
      });

      expect(error.stack).toBeDefined();
    });

    it('应该能被 try-catch 捕获', () => {
      const zodError = createZodError(simpleSchema, invalidSimpleData_wrongIdType);

      expect(() => {
        throw new ApiValidationError(zodError, { endpoint: 'test' });
      }).toThrow(ApiValidationError);
    });
  });
});
