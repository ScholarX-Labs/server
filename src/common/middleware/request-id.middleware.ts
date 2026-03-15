import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * RequestIdMiddleware
 *
 * Runs before every route handler. Ensures every request carries a unique
 * correlation ID that flows through logs, error responses, and response headers
 * for distributed tracing.
 *
 * Behaviour:
 *  - If the upstream gateway / client sends `X-Request-Id`, honour it.
 *  - Otherwise generate a new UUID v4 via Node's native crypto.randomUUID().
 *  - Write the ID to both req.headers (for downstream reading by filter/logger)
 *    and the response `X-Request-Id` header (for client-side tracing).
 *  - Set `X-Content-Type-Options: nosniff` as a baseline security header.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.length > 0
        ? incomingId
        : randomUUID();

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  }
}
