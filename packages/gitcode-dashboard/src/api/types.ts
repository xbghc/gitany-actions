/** API 响应通用类型 (Server 端包装) */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}
