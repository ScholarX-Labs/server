import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../exceptions/app.exception';
import {
  ERROR_CODES,
  type ErrorCodeDefinition,
} from '../constants/error-codes.constant';
import type {
  IApiErrorResponse,
  IApiErrorBody,
  ValidationErrorDetail,
} from '../interfaces';

/**
 * Maps standard HTTP status codes to their corresponding ErrorCodeDefinition.
 * Used when a plain HttpException is thrown (i.e. not an AppException).
 */
const HTTP_STATUS_TO_ERROR_CODE: Partial<
  Record<HttpStatus, ErrorCodeDefinition>
> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ERROR_CODES.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.TOO_MANY_REQUESTS,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODES.SERVICE_UNAVAILABLE,
};

/**
 * ExceptionResponseBuilder
 *
 * Single responsibility: transform any exception into the standard
 * IApiErrorResponse contract. Pure function — no side effects, no logging.
 *
 * Resolution chain (priority order):
 *  1. AppException               → use pre-set errorCode directly
 *  2. HttpException + msg array  → ValidationPipe format → VALIDATION_ERROR
 *  3. Plain HttpException        → look up HTTP_STATUS_TO_ERROR_CODE map
 *  4. Unknown error              → INTERNAL_SERVER_ERROR with [REF: ...] code
 *
 * Security rules:
 *  - stack is ONLY included when isDevelopment === true
 *  - Unknown error messages are NEVER reflected to the client
 *  - details is null (not undefined/omitted) for non-validation errors
 */
export class ExceptionResponseBuilder {
  build(
    exception: unknown,
    request: Request,
    isDevelopment: boolean,
  ): IApiErrorResponse {
    const requestId = this.extractRequestId(request);
    const timestamp = new Date().toISOString();
    const path = request.url ?? 'unknown';
    const method = request.method ?? 'UNKNOWN';

    let errorCode: ErrorCodeDefinition;
    let httpStatus: number;
    let message: string;
    let details: ValidationErrorDetail[] | null = null;
    let stack: string | undefined;

    // ── 1. AppException — typed, pre-set error code ───────────────────────
    if (exception instanceof AppException) {
      errorCode = exception.errorCode;
      httpStatus = exception.getStatus();
      message = exception.message;
      details = exception.details ?? null;
      stack = isDevelopment ? exception.stack : undefined;
    }
    // ── 2. HttpException with message array (ValidationPipe default format) ─
    else if (exception instanceof HttpException) {
      const response = exception.getResponse();
      httpStatus = exception.getStatus();
      stack = isDevelopment ? exception.stack : undefined;

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response &&
        Array.isArray((response as Record<string, unknown>).message)
      ) {
        // NestJS ValidationPipe throws: { statusCode, message: string[], error }
        // NOTE: the flattenValidationErrors util handles nested DTOs in main.ts
        // via exceptionFactory; this branch handles the rare case where a plain
        // ValidationPipe (without exceptionFactory) still throws the array format.
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        message = 'Validation failed. Please check the provided data.';
        const rawMessages = (response as Record<string, unknown>)
          .message as string[];
        details = rawMessages.map((msg) => ({
          field: 'unknown',
          constraints: { message: msg },
        }));
      } else {
        // ── 3. Plain HttpException ─────────────────────────────────────────
        errorCode =
          HTTP_STATUS_TO_ERROR_CODE[httpStatus as HttpStatus] ??
          ERROR_CODES.INTERNAL_SERVER_ERROR;
        message =
          typeof response === 'string'
            ? response
            : (response as Record<string, unknown>)?.message?.toString() ??
              'An error occurred.';
      }
    }
    // ── 4. Unknown / unhandled error ─────────────────────────────────────
    else {
      errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      // Never reflect the raw error message — use reference code for tracing
      message = `An unexpected error occurred. Please try again later. [REF: ${requestId.slice(0, 8)}]`;
      stack =
        isDevelopment && exception instanceof Error
          ? exception.stack
          : undefined;
    }

    const errorBody: IApiErrorBody = {
      statusCode: httpStatus,
      code: errorCode.code,
      numericCode: errorCode.numericCode,
      message,
      details,
      ...(stack && { stack }),
    };

    return {
      success: false,
      error: errorBody,
      meta: {
        timestamp,
        path,
        method,
        requestId,
      },
    };
  }

  private extractRequestId(request: Request): string {
    const id = request.headers['x-request-id'];
    return typeof id === 'string' && id.length > 0 ? id : 'no-request-id';
  }
}
