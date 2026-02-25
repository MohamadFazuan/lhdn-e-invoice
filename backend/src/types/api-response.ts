export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta'],
): ApiResponse<T> {
  return { success: true, data, ...(meta !== undefined ? { meta } : {}) };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>,
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}
