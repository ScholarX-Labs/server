import {
  Catch,
  Injectable,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import type { Request, Response } from 'express';
import { DatabaseErrorMapper } from '../mappers/database-error.mapper';
import { ExceptionResponseBuilder } from '../builders/exception-response.builder';

/**
 * GlobalExceptionFilter
 *
 * The single catch-all exception filter for the entire application.
 * Registered via APP_FILTER in AppModule (required for DI — HttpAdapterHost
 * must be injected; app.useGlobalFilters() does NOT support DI).
 *
 * Orchestration (catch method):
 *  1. Extract request from execution context
 *  2. Attempt DB error mapping (isPgSqlError duck-type guard inside)
 *  3. Build the standardised IApiErrorResponse via ExceptionResponseBuilder
 *  4. Log with pino (redaction fires automatically at serializer level)
 *  5. Reply via HttpAdapterHost (framework-agnostic — works with Fastify too)
 *
 * Logging:
 *  - 5xx: logger.error with full error object (pino redacts sensitive fields)
 *  - 4xx: logger.warn with request context only (no stack needed)
 *
 * isDevelopment is computed ONCE at construction — not per-request.
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly isDevelopment: boolean;
  private readonly dbMapper: DatabaseErrorMapper;
  private readonly responseBuilder: ExceptionResponseBuilder;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.dbMapper = new DatabaseErrorMapper();
    this.responseBuilder = new ExceptionResponseBuilder();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Step 1: Attempt DB error mapping
    const resolvedError = this.dbMapper.map(exception) ?? exception;

    // Step 2: Build the standardised response body
    const responseBody = this.responseBuilder.build(
      resolvedError,
      request,
      this.isDevelopment,
    );

    const { statusCode } = responseBody.error;
    const requestId =
      (request.headers['x-request-id'] as string) ?? 'no-request-id';
    const userId =
      (request as Request & { user?: { id?: string } }).user?.id ?? 'anonymous';
    const logContext = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      userId,
    };

    // Step 3: Log — 5xx as error (with full err object), 4xx as warn
    if (statusCode >= 500) {
      this.logger.error(
        { err: resolvedError, ...logContext },
        `[${statusCode}] ${request.method} ${request.url}`,
      );
    } else {
      this.logger.warn(
        logContext,
        `[${statusCode}] ${request.method} ${request.url}`,
      );
    }

    // Step 4: Send the response
    httpAdapter.reply(response, responseBody, statusCode);
  }
}
