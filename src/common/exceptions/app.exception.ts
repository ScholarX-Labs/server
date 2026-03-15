import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCodeDefinition } from '../constants/error-codes.constant';
import type { ValidationErrorDetail } from '../interfaces';

/**
 * AppException — the single custom exception type used across the entire app.
 *
 * Extends HttpException (LSP-compliant: fully substitutable wherever NestJS
 * expects HttpException). Carries a typed ErrorCodeDefinition so the filter
 * never has to guess the code — it's pre-set at throw time.
 *
 * Usage:
 *   throw new AppException(ERROR_CODES.COURSE_NOT_FOUND, HttpStatus.NOT_FOUND);
 *   throw new AppException(ERROR_CODES.USER_BLOCKED, HttpStatus.FORBIDDEN, 'Your account has been suspended.');
 */
export class AppException extends HttpException {
  readonly errorCode: ErrorCodeDefinition;
  readonly details: ValidationErrorDetail[] | undefined;

  constructor(
    errorCode: ErrorCodeDefinition,
    httpStatus: HttpStatus,
    message?: string,
    details?: ValidationErrorDetail[],
    options?: { cause?: Error },
  ) {
    super(message ?? errorCode.code, httpStatus, options);
    this.errorCode = errorCode;
    this.details = details;
  }
}
