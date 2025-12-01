import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseApiResponse, safeParseApiResponse } from '../../../client/parser.js';
import { ApiValidationError } from '../../../client/errors.js';
import {
  simpleSchema,
  nestedSchema,
  validSimpleData,
  validNestedData,
  invalidSimpleData_wrongIdType,
  invalidSimpleData_missingName,
  invalidNestedData_wrongEmail,
} from '../fixtures/error.fixtures.js';

describe('parseApiResponse', () => {
  describe('成功解析', () => {
    it('应该返回验证后的数据（简单类型）', () => {
      const result = parseApiResponse(simpleSchema, validSimpleData, {
        endpoint: 'test/endpoint',
      });

      expect(result).toEqual(validSimpleData);
    });

    it('应该返回验证后的数据（复杂嵌套对象）', () => {
      const result = parseApiResponse(nestedSchema, validNestedData, {
        endpoint: 'test/endpoint',
      });

      expect(result).toEqual(validNestedData);
    });

    it('应该返回验证后的数据（数组类型）', () => {
      const arraySchema = z.array(simpleSchema);
      const arrayData = [validSimpleData, { ...validSimpleData, id: 2, name: 'Test 2' }];

      const result = parseApiResponse(arraySchema, arrayData, {
        endpoint: 'test/endpoint',
      });

      expect(result).toEqual(arrayData);
      expect(result).toHaveLength(2);
    });

    it('应该处理可选字段', () => {
      const dataWithOptional = { ...validSimpleData, active: true };

      const result = parseApiResponse(simpleSchema, dataWithOptional, {
        endpoint: 'test/endpoint',
      });

      expect(result.active).toBe(true);
    });

    it('应该处理省略可选字段的数据', () => {
      const dataWithoutOptional = { id: 1, name: 'Test' };

      const result = parseApiResponse(simpleSchema, dataWithoutOptional, {
        endpoint: 'test/endpoint',
      });

      expect(result.active).toBeUndefined();
    });

    it('应该返回类型安全的数据', () => {
      const result = parseApiResponse(simpleSchema, validSimpleData, {
        endpoint: 'test/endpoint',
      });

      // TypeScript 应该能推断出正确的类型
      const id: number = result.id;
      const name: string = result.name;

      expect(typeof id).toBe('number');
      expect(typeof name).toBe('string');
    });
  });

  describe('验证失败', () => {
    it('应该在类型不匹配时抛出 ApiValidationError', () => {
      expect(() =>
        parseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
          endpoint: 'test/endpoint',
        }),
      ).toThrow(ApiValidationError);
    });

    it('应该在必需字段缺失时抛出 ApiValidationError', () => {
      expect(() =>
        parseApiResponse(simpleSchema, invalidSimpleData_missingName, {
          endpoint: 'test/endpoint',
        }),
      ).toThrow(ApiValidationError);
    });

    it('错误应该包含正确的 endpoint 信息', () => {
      try {
        parseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
          endpoint: 'repos/owner/repo/pulls',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        expect((error as ApiValidationError).context.endpoint).toBe('repos/owner/repo/pulls');
      }
    });

    it('错误应该包含正确的 method 信息', () => {
      try {
        parseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
          endpoint: 'test/endpoint',
          method: 'POST',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        expect((error as ApiValidationError).context.method).toBe('POST');
      }
    });

    it('错误应该包含原始数据用于调试', () => {
      try {
        parseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
          endpoint: 'test/endpoint',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        expect((error as ApiValidationError).context.data).toEqual(invalidSimpleData_wrongIdType);
      }
    });

    it('错误应该包含 params 信息（如果提供）', () => {
      try {
        parseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
          endpoint: 'test/endpoint',
          params: { state: 'open', page: 1 },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        expect((error as ApiValidationError).context.params).toEqual({ state: 'open', page: 1 });
      }
    });

    it('应该在嵌套验证失败时提供详细路径', () => {
      try {
        parseApiResponse(nestedSchema, invalidNestedData_wrongEmail, {
          endpoint: 'test/endpoint',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        const issues = (error as ApiValidationError).getIssues();
        expect(issues.some((issue) => issue.path.includes('user.profile.email'))).toBe(true);
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 数据', () => {
      const nullableSchema = z.null();

      const result = parseApiResponse(nullableSchema, null, {
        endpoint: 'test/endpoint',
      });

      expect(result).toBeNull();
    });

    it('应该拒绝意外的 null 数据', () => {
      expect(() =>
        parseApiResponse(simpleSchema, null, {
          endpoint: 'test/endpoint',
        }),
      ).toThrow(ApiValidationError);
    });

    it('应该拒绝 undefined 数据', () => {
      expect(() =>
        parseApiResponse(simpleSchema, undefined, {
          endpoint: 'test/endpoint',
        }),
      ).toThrow(ApiValidationError);
    });

    it('应该处理空对象', () => {
      const emptySchema = z.object({});

      const result = parseApiResponse(
        emptySchema,
        {},
        {
          endpoint: 'test/endpoint',
        },
      );

      expect(result).toEqual({});
    });

    it('应该处理空数组', () => {
      const arraySchema = z.array(simpleSchema);

      const result = parseApiResponse(arraySchema, [], {
        endpoint: 'test/endpoint',
      });

      expect(result).toEqual([]);
    });

    it('应该处理包含空值的数组', () => {
      const nullableArraySchema = z.array(z.string().nullable());

      const result = parseApiResponse(nullableArraySchema, ['a', null, 'b'], {
        endpoint: 'test/endpoint',
      });

      expect(result).toEqual(['a', null, 'b']);
    });

    it('应该拒绝额外的未定义字段（strict schema）', () => {
      const strictSchema = z.object({ id: z.number() }).strict();
      const dataWithExtra = { id: 1, extra: 'field' };

      expect(() =>
        parseApiResponse(strictSchema, dataWithExtra, {
          endpoint: 'test/endpoint',
        }),
      ).toThrow(ApiValidationError);
    });

    it('应该忽略额外字段（默认 schema）', () => {
      const dataWithExtra = { ...validSimpleData, extra: 'field' };

      const result = parseApiResponse(simpleSchema, dataWithExtra, {
        endpoint: 'test/endpoint',
      });

      // 默认 Zod 会剥离额外字段
      expect(result).toEqual(validSimpleData);
    });
  });

  describe('类型转换', () => {
    it('应该使用 coerce 处理字符串数字', () => {
      const coerceSchema = z.object({
        id: z.coerce.number(),
        name: z.string(),
      });

      const result = parseApiResponse(
        coerceSchema,
        { id: '123', name: 'Test' },
        {
          endpoint: 'test/endpoint',
        },
      );

      expect(result.id).toBe(123);
      expect(typeof result.id).toBe('number');
    });

    it('应该处理日期字符串', () => {
      const dateSchema = z.object({
        created_at: z.string().datetime(),
      });

      const result = parseApiResponse(
        dateSchema,
        { created_at: '2024-01-01T00:00:00Z' },
        {
          endpoint: 'test/endpoint',
        },
      );

      expect(result.created_at).toBe('2024-01-01T00:00:00Z');
    });

    it('应该拒绝无效的日期格式', () => {
      const dateSchema = z.object({
        created_at: z.string().datetime(),
      });

      expect(() =>
        parseApiResponse(
          dateSchema,
          { created_at: 'not-a-date' },
          {
            endpoint: 'test/endpoint',
          },
        ),
      ).toThrow(ApiValidationError);
    });
  });

  describe('联合类型', () => {
    it('应该处理 union 类型', () => {
      const unionSchema = z.union([
        z.object({ type: z.literal('a'), valueA: z.string() }),
        z.object({ type: z.literal('b'), valueB: z.number() }),
      ]);

      const resultA = parseApiResponse(
        unionSchema,
        { type: 'a', valueA: 'test' },
        {
          endpoint: 'test/endpoint',
        },
      );
      expect(resultA.type).toBe('a');

      const resultB = parseApiResponse(
        unionSchema,
        { type: 'b', valueB: 123 },
        {
          endpoint: 'test/endpoint',
        },
      );
      expect(resultB.type).toBe('b');
    });

    it('应该拒绝不匹配任何 union 成员的数据', () => {
      const unionSchema = z.union([z.string(), z.number()]);

      expect(() =>
        parseApiResponse(
          unionSchema,
          { invalid: 'object' },
          {
            endpoint: 'test/endpoint',
          },
        ),
      ).toThrow(ApiValidationError);
    });
  });
});

describe('safeParseApiResponse', () => {
  describe('成功解析', () => {
    it('应该返回 success: true 和验证后的数据', () => {
      const result = safeParseApiResponse(simpleSchema, validSimpleData, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSimpleData);
      }
    });

    it('应该返回正确的类型（类型守卫测试）', () => {
      const result = safeParseApiResponse(simpleSchema, validSimpleData, {
        endpoint: 'test/endpoint',
      });

      if (result.success) {
        // TypeScript 应该推断出 result.data 的类型
        const id: number = result.data.id;
        const name: string = result.data.name;
        expect(typeof id).toBe('number');
        expect(typeof name).toBe('string');
      } else {
        expect.fail('Expected success');
      }
    });

    it('应该处理复杂嵌套对象', () => {
      const result = safeParseApiResponse(nestedSchema, validNestedData, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validNestedData);
      }
    });

    it('应该处理数组类型', () => {
      const arraySchema = z.array(simpleSchema);
      const arrayData = [validSimpleData, { ...validSimpleData, id: 2, name: 'Test 2' }];

      const result = safeParseApiResponse(arraySchema, arrayData, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(arrayData);
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe('验证失败', () => {
    it('应该返回 success: false 和 ApiValidationError（不抛出异常）', () => {
      const result = safeParseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ApiValidationError);
      }
    });

    it('应该在必需字段缺失时返回失败结果', () => {
      const result = safeParseApiResponse(simpleSchema, invalidSimpleData_missingName, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ApiValidationError);
      }
    });

    it('错误应该包含正确的上下文信息', () => {
      const result = safeParseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
        endpoint: 'repos/owner/repo/pulls',
        method: 'GET',
        params: { state: 'open' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.context.endpoint).toBe('repos/owner/repo/pulls');
        expect(result.error.context.method).toBe('GET');
        expect(result.error.context.params).toEqual({ state: 'open' });
      }
    });

    it('错误应该包含原始数据用于调试', () => {
      const result = safeParseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.context.data).toEqual(invalidSimpleData_wrongIdType);
      }
    });

    it('应该能通过错误方法获取详细信息', () => {
      const result = safeParseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(typeof result.error.getSummary()).toBe('string');
        expect(typeof result.error.getIssues).toBe('function');
        expect(typeof result.error.getFieldErrors).toBe('function');
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 数据', () => {
      const nullableSchema = z.null();

      const result = safeParseApiResponse(nullableSchema, null, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('应该拒绝意外的 null 数据', () => {
      const result = safeParseApiResponse(simpleSchema, null, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(false);
    });

    it('应该拒绝 undefined 数据', () => {
      const result = safeParseApiResponse(simpleSchema, undefined, {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(false);
    });

    it('应该处理空数组', () => {
      const arraySchema = z.array(simpleSchema);

      const result = safeParseApiResponse(arraySchema, [], {
        endpoint: 'test/endpoint',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('与 parseApiResponse 的一致性', () => {
    it('成功时两者应该返回相同的数据', () => {
      const safeResult = safeParseApiResponse(simpleSchema, validSimpleData, {
        endpoint: 'test/endpoint',
      });
      const directResult = parseApiResponse(simpleSchema, validSimpleData, {
        endpoint: 'test/endpoint',
      });

      expect(safeResult.success).toBe(true);
      if (safeResult.success) {
        expect(safeResult.data).toEqual(directResult);
      }
    });

    it('失败时 safeParseApiResponse 不应抛出异常', () => {
      // safeParseApiResponse 不应该抛出异常
      const safeResult = safeParseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
        endpoint: 'test/endpoint',
      });
      expect(safeResult.success).toBe(false);

      // parseApiResponse 应该抛出异常
      expect(() =>
        parseApiResponse(simpleSchema, invalidSimpleData_wrongIdType, {
          endpoint: 'test/endpoint',
        }),
      ).toThrow(ApiValidationError);
    });
  });
});
