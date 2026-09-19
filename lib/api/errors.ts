/**
 * API Standard Error Types & Codes
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'INSUFFICIENT_STOCK'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
