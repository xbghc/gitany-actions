import { describe, it, expect } from 'vitest';
import { parseGitUrl, toGitUrl, toQuery } from './index.js';

describe('parseGitUrl', () => {
  it('应该解析 HTTPS URL（不带 .git）', () => {
    const result = parseGitUrl('https://gitcode.com/owner/repo');
    expect(result).toEqual({
      host: 'gitcode.com',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该解析 HTTPS URL（带 .git 后缀）', () => {
    const result = parseGitUrl('https://gitcode.com/owner/repo.git');
    expect(result).toEqual({
      host: 'gitcode.com',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该解析 HTTP URL', () => {
    const result = parseGitUrl('http://gitcode.com/owner/repo');
    expect(result).toEqual({
      host: 'gitcode.com',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该解析 SSH URL（不带 .git）', () => {
    const result = parseGitUrl('git@gitcode.com:owner/repo');
    expect(result).toEqual({
      host: 'gitcode.com',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该解析 SSH URL（带 .git 后缀）', () => {
    const result = parseGitUrl('git@gitcode.com:owner/repo.git');
    expect(result).toEqual({
      host: 'gitcode.com',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该处理 GitHub URL', () => {
    const result = parseGitUrl('https://github.com/owner/repo');
    expect(result).toEqual({
      host: 'github.com',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该处理带端口号的 HTTPS URL', () => {
    const result = parseGitUrl('https://gitcode.com:8080/owner/repo');
    expect(result).toEqual({
      host: 'gitcode.com:8080',
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('应该对无效 URL 返回 null', () => {
    expect(parseGitUrl('invalid-url')).toBeNull();
    expect(parseGitUrl('http://gitcode.com')).toBeNull();
    expect(parseGitUrl('https://gitcode.com/owner')).toBeNull();
    expect(parseGitUrl('git@gitcode.com')).toBeNull();
  });

  it('应该对空字符串返回 null', () => {
    expect(parseGitUrl('')).toBeNull();
  });
});

describe('toGitUrl', () => {
  it('应该为不带 .git 的 URL 添加 .git 后缀', () => {
    const result = toGitUrl('https://gitcode.com/owner/repo');
    expect(result).toBe('https://gitcode.com/owner/repo.git');
  });

  it('应该保持已有的 .git 后缀（幂等性）', () => {
    const url = 'https://gitcode.com/owner/repo.git';
    expect(toGitUrl(url)).toBe(url);
    expect(toGitUrl(toGitUrl(url))).toBe(url); // 多次调用应该相同
  });

  it('应该处理 SSH URL', () => {
    const result = toGitUrl('git@gitcode.com:owner/repo');
    expect(result).toBe('git@gitcode.com:owner/repo.git');
  });

  it('应该处理空字符串', () => {
    expect(toGitUrl('')).toBe('.git');
  });
});

describe('toQuery', () => {
  it('应该保留 string 类型的值', () => {
    const result = toQuery({ key: 'value' });
    expect(result).toEqual({ key: 'value' });
  });

  it('应该保留 number 类型的值', () => {
    const result = toQuery({ page: 1, per_page: 20 });
    expect(result).toEqual({ page: 1, per_page: 20 });
  });

  it('应该保留 boolean 类型的值', () => {
    const result = toQuery({ active: true, disabled: false });
    expect(result).toEqual({ active: true, disabled: false });
  });

  it('应该过滤 undefined 值', () => {
    const result = toQuery({
      defined: 'value',
      undefined: undefined,
      alsoUndefined: undefined,
    });
    expect(result).toEqual({ defined: 'value' });
  });

  it('应该处理混合类型', () => {
    const result = toQuery({
      state: 'open',
      page: 1,
      active: true,
      optional: undefined,
    });
    expect(result).toEqual({
      state: 'open',
      page: 1,
      active: true,
    });
  });

  it('应该处理空对象', () => {
    expect(toQuery({})).toEqual({});
  });

  it('应该处理 null 输入', () => {
    expect(toQuery(null)).toEqual({});
  });

  it('应该处理 undefined 输入', () => {
    expect(toQuery(undefined)).toEqual({});
  });

  it('应该将复杂类型转换为字符串', () => {
    const result = toQuery({
      array: [1, 2, 3] as unknown as string,
      object: { nested: 'value' } as unknown as string,
    });
    // 根据实现，这些应该被转换为 String() 表示
    expect(result.array).toBe('1,2,3');
    expect(result.object).toBe('[object Object]');
  });
});
