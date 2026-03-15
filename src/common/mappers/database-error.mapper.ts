import { HttpStatus } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import { ERROR_CODES } from '../constants/error-codes.constant';

/**
 * IExceptionMapper — Open/Closed contract.
 * Implement this interface to add new mapper strategies (OCP).
 * Return null for errors that this mapper cannot handle.
 */
export interface IExceptionMapper {
  map(error: unknown): AppException | null;
}

/**
 * Tight duck-type fingerprint for PostgreSQL driver errors.
 *
 * The `pg` driver attaches three properties that no other common library
 * (Axios, Node `fs`, NestJS HTTP module) produces simultaneously:
 *   - severity : 'ERROR' | 'FATAL' | 'PANIC' — PG error severity level
 *   - code     : SQL state code, e.g. '23505', '22P02'
 *   - routine  : Internal PG backend routine name, e.g. '_ri_ReportViolation'
 *
 * All three must be present. Errors with only `code` (e.g. `ECONNREFUSED`
 * from Axios / Node system errors) will correctly fail this guard and return
 * null — falling through to the filter as a generic 500.
 */
type PgSqlError = {
  severity: string;
  code: string;
  routine: string;
  detail?: string;
  table?: string;
  constraint?: string;
};

function isPgSqlError(error: unknown): error is PgSqlError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'severity' in error &&
    'code' in error &&
    'routine' in error
  );
}

/**
 * DatabaseErrorMapper
 *
 * Single responsibility: detect PostgreSQL/Drizzle errors via duck-typing and
 * translate them to typed AppException instances. Returns null for all
 * non-PostgreSQL errors — the GlobalExceptionFilter handles the rest.
 *
 * IMPORTANT: ECONNREFUSED / ENOTFOUND are intentionally excluded. Node system
 * errors lack `severity` and `routine`, so they correctly fall through as null.
 * A request-time connection failure is an INTERNAL_SERVER_ERROR regardless of
 * which service caused it. Startup-time DB connectivity is handled separately
 * in DbService.onModuleInit().
 */
export class DatabaseErrorMapper implements IExceptionMapper {
  map(error: unknown): AppException | null {
    // First: check if the error itself is a PG error
    if (isPgSqlError(error)) {
      return this.mapPgError(error);
    }

    // Second: check error.cause — Drizzle may wrap the raw PG error in either
    // an Error subclass OR a plain object (depending on the driver version)
    if (
      error !== null &&
      typeof error === 'object' &&
      'cause' in error &&
      isPgSqlError((error as { cause: unknown }).cause)
    ) {
      return this.mapPgError((error as { cause: PgSqlError }).cause);
    }

    return null;
  }

  private mapPgError(pgError: PgSqlError): AppException {
    switch (pgError.code) {
      case '23505': // unique_violation
        return new AppException(
          ERROR_CODES.DB_UNIQUE_VIOLATION,
          HttpStatus.CONFLICT,
          'A resource with these details already exists.',
        );

      case '23503': // foreign_key_violation
        return new AppException(
          ERROR_CODES.DB_FOREIGN_KEY_VIOLATION,
          HttpStatus.CONFLICT,
          'Referencing resource does not exist.',
        );

      case '23502': // not_null_violation
        return new AppException(
          ERROR_CODES.BAD_REQUEST,
          HttpStatus.BAD_REQUEST,
          'A required field is missing.',
        );

      case '23514': // check_violation
        return new AppException(
          ERROR_CODES.BAD_REQUEST,
          HttpStatus.BAD_REQUEST,
          'A field value violates a constraint.',
        );

      case '22P02': // invalid_text_representation
        return new AppException(
          ERROR_CODES.BAD_REQUEST,
          HttpStatus.BAD_REQUEST,
          'Invalid identifier format provided.',
        );

      default:
        // Recognised as a PG error but SQL state is unmapped.
        // Return a generic 500 — preserves DB-origin info for internal logs
        // while keeping the client response generic and safe.
        return new AppException(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          HttpStatus.INTERNAL_SERVER_ERROR,
          'A database error occurred.',
        );
    }
  }
}
