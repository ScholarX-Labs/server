import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionResponseBuilder } from './exception-response.builder';
import { AppException } from '../exceptions';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ValidationErrorDetail } from '../interfaces';
import type { Request } from 'express';

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    url: '/test',
    headers: { 'x-request-id': 'test-req-id-1234' },
    ...overrides,
  } as unknown as Request;
}

describe('ExceptionResponseBuilder', () => {
  let builder: ExceptionResponseBuilder;

  beforeEach(() => {
    builder = new ExceptionResponseBuilder();
  });

  it('builds a response for AppException', () => {
    const exc = new AppException(
      ERROR_CODES.COURSE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Course not found',
    );
    const result = builder.build(exc, mockRequest(), false);

    expect(result.success).toBe(false);
    expect(result.error.statusCode).toBe(404);
    expect(result.error.code).toBe(ERROR_CODES.COURSE_NOT_FOUND.code);
    expect(result.error.numericCode).toBe(ERROR_CODES.COURSE_NOT_FOUND.numericCode);
    expect(result.meta.requestId).toBe('test-req-id-1234');
  });

  it('includes details array for AppException with validation errors', () => {
    const details: ValidationErrorDetail[] = [
      { field: 'title', constraints: { isString: 'must be string' } },
    ];
    const exc = new AppException(
      ERROR_CODES.VALIDATION_ERROR,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Validation failed',
      details,
    );
    const result = builder.build(exc, mockRequest(), false);

    expect(result.error.details).toEqual(details);
  });

  it('resolves plain HttpException to an error code via status map', () => {
    const exc = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const result = builder.build(exc, mockRequest(), false);

    expect(result.error.statusCode).toBe(404);
    expect(result.error.code).toBeDefined();
  });

  it('handles unknown (non-HttpException) errors as 500', () => {
    const result = builder.build(new Error('boom'), mockRequest(), false);
    expect(result.error.statusCode).toBe(500);
    // Unknown message must NOT be reflected — generic message expected
    expect(result.error.message).not.toBe('boom');
  });

  it('omits stack in production (isDevelopment = false)', () => {
    const exc = new AppException(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'fail',
    );
    const result = builder.build(exc, mockRequest(), false);
    expect(result.error.stack).toBeUndefined();
  });

  it('includes stack in development (isDevelopment = true)', () => {
    const exc = new AppException(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'fail',
    );
    const result = builder.build(exc, mockRequest(), true);
    expect(result.error.stack).toBeDefined();
  });

  it('sets meta with timestamp, path, method, requestId', () => {
    const req = mockRequest({ method: 'POST', url: '/courses' });
    const exc = new AppException(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'fail',
    );
    const result = builder.build(exc, req, false);

    expect(result.meta.path).toBe('/courses');
    expect(result.meta.method).toBe('POST');
    expect(result.meta.requestId).toBe('test-req-id-1234');
    expect(typeof result.meta.timestamp).toBe('string');
  });

  it('uses a short reference for unknown errors (no real message leaked)', () => {
    const result = builder.build(new Error('super secret internal'), mockRequest(), false);
    expect(result.error.message).not.toContain('super secret internal');
    expect(result.error.message).toMatch(/\[REF:/);
  });
});
