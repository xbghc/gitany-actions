import type { OptionsOfTextResponseBody } from 'got';
import type { RetryOptions } from 'got';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export type HttpRequestParams = {
  method: HttpMethod;
  url: string;
  token?: string;
  options?: HttpRequestOptions;
};

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean>;
  json?: unknown;
  body?: OptionsOfTextResponseBody['body'];
  retry?: number | Partial<RetryOptions>;
  responseType?: 'json' | 'text';
}
