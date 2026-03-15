import { HttpStatus } from '@nestjs/common';
import { DatabaseErrorMapper } from './database-error.mapper';
import { AppException } from '../exceptions';
import { ERROR_CODES } from '../constants/error-codes.constant';

/** Creates an object that satisfies the isPgSqlError duck-type guard */
function makePgError(code: string, message = 'pg error'): object {
  return { severity: 'ERROR', code, routine: 'somePgRoutine', message };
}

describe('DatabaseErrorMapper', () => {
  let mapper: DatabaseErrorMapper;

  beforeEach(() => {
    mapper = new DatabaseErrorMapper();
  });

  it('returns null for non-PG errors', () => {
    expect(mapper.map(new Error('generic'))).toBeNull();
  });

  it('returns null for plain objects without pg signature', () => {
    expect(mapper.map({ code: '23505' })).toBeNull();
  });

  it('does NOT match an object with only "code" set (mimicry resistance)', () => {
    expect(mapper.map({ code: '23505', message: 'fake' })).toBeNull();
  });

  it('does NOT match an object where only severity + code match but routine is missing', () => {
    expect(mapper.map({ severity: 'ERROR', code: '23505' })).toBeNull();
  });

  it('maps PG 23505 to 409 UNIQUE_VIOLATION', () => {
    const result = mapper.map(makePgError('23505'));
    expect(result).toBeInstanceOf(AppException);
    expect(result!.getStatus()).toBe(HttpStatus.CONFLICT);
    expect((result as AppException).errorCode).toBe(ERROR_CODES.DB_UNIQUE_VIOLATION);
  });

  it('maps PG 23503 to 409 FOREIGN_KEY_VIOLATION', () => {
    const result = mapper.map(makePgError('23503'));
    expect(result).toBeInstanceOf(AppException);
    expect(result!.getStatus()).toBe(HttpStatus.CONFLICT);
    expect((result as AppException).errorCode).toBe(ERROR_CODES.DB_FOREIGN_KEY_VIOLATION);
  });

  it('maps PG 23502 to 400', () => {
    const result = mapper.map(makePgError('23502'));
    expect(result).toBeInstanceOf(AppException);
    expect(result!.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('maps PG 22P02 to 400', () => {
    const result = mapper.map(makePgError('22P02'));
    expect(result!.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('maps unknown PG codes to 500', () => {
    const result = mapper.map(makePgError('99999'));
    expect(result!.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('handles Drizzle wrapper (error.cause is the real PG error)', () => {
    const wrapper = { message: 'drizzle wrapper', cause: makePgError('23505') };
    const result = mapper.map(wrapper);
    expect(result).toBeInstanceOf(AppException);
    expect(result!.getStatus()).toBe(HttpStatus.CONFLICT);
  });
});
