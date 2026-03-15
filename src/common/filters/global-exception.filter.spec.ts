import { HttpAdapterHost } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { AppException } from '../exceptions';
import { ERROR_CODES } from '../constants/error-codes.constant';

function mockLogger() {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

function mockHttpAdapter(reply = jest.fn()) {
  return { reply };
}

function mockHost(request: Partial<Request> = {}, response = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/test',
        headers: { 'x-request-id': 'req-abc-123456' },
        ...request,
      }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let logger: ReturnType<typeof mockLogger>;
  let replyFn: jest.Mock;

  beforeEach(() => {
    logger = mockLogger();
    replyFn = jest.fn();

    const adapterHost = {
      httpAdapter: mockHttpAdapter(replyFn),
    } as unknown as HttpAdapterHost;

    filter = new GlobalExceptionFilter(adapterHost, logger as any);
  });

  it('calls httpAdapter.reply with the response body', () => {
    const host = mockHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);
    expect(replyFn).toHaveBeenCalledTimes(1);
    const [, body, statusCode] = replyFn.mock.calls[0];
    expect(statusCode).toBe(404);
    expect(body.success).toBe(false);
  });

  it('uses logger.warn for 4xx exceptions', () => {
    const host = mockHost();
    filter.catch(new HttpException('Bad request', HttpStatus.BAD_REQUEST), host);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('uses logger.error for 5xx exceptions', () => {
    const host = mockHost();
    filter.catch(new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR), host);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses logger.error for unknown (non-HTTP) errors', () => {
    const host = mockHost();
    filter.catch(new Error('unexpected'), host);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('passes the requestId from X-Request-Id header into the response meta', () => {
    const host = mockHost({ headers: { 'x-request-id': 'custom-id-xyz' } } as any);
    filter.catch(new AppException(ERROR_CODES.COURSE_NOT_FOUND, HttpStatus.NOT_FOUND), host);
    const [, body] = replyFn.mock.calls[0];
    expect(body.meta.requestId).toBe('custom-id-xyz');
  });

  it('handles DB PG 23505 errors and returns 409', () => {
    const host = mockHost();
    const pgError = { severity: 'ERROR', code: '23505', routine: 'insert', message: 'duplicate' };
    filter.catch(pgError, host);
    const [, body, statusCode] = replyFn.mock.calls[0];
    expect(statusCode).toBe(409);
    expect(body.error.code).toBe(ERROR_CODES.DB_UNIQUE_VIOLATION.code);
  });
});
