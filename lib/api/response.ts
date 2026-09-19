import { NextResponse } from 'next/server';
import type { ApiErrorCode, ApiErrorDetail } from './errors';

export interface ApiSuccessEnvelope<T = any> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

/**
 * Returns a standardized JSON success response.
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>,
  headers?: Record<string, string>
) {
  const body: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };

  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

/**
 * Returns a standardized JSON error response.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number = 400,
  details?: ApiErrorDetail[],
  headers?: Record<string, string>
) {
  const body: ApiErrorEnvelope = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };

  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}
