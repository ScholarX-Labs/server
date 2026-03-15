export interface ErrorCodeDefinition {
  readonly code: string;
  readonly numericCode: number;
}

/**
 * Hybrid error code registry.
 * - String code: human-readable, domain-prefixed (e.g. 'COURSE_NOT_FOUND')
 * - Numeric code: machine-readable per domain range
 *
 * Ranges:
 *   9xxx — Global / HTTP fallbacks
 *   1xxx — Courses
 *   2xxx — Users
 *   3xxx — Auth
 *   4xxx — Subscriptions
 *   5xxx — Lessons
 *   8xxx — Infrastructure / Database
 */
export const ERROR_CODES = {
  // ── 9xxx Global ──────────────────────────────────────────────────────────
  INTERNAL_SERVER_ERROR: { code: 'INTERNAL_SERVER_ERROR', numericCode: 9999 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', numericCode: 9001 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', numericCode: 9002 },
  FORBIDDEN: { code: 'FORBIDDEN', numericCode: 9003 },
  NOT_FOUND: { code: 'NOT_FOUND', numericCode: 9004 },
  BAD_REQUEST: { code: 'BAD_REQUEST', numericCode: 9005 },
  CONFLICT: { code: 'CONFLICT', numericCode: 9006 },
  TOO_MANY_REQUESTS: { code: 'TOO_MANY_REQUESTS', numericCode: 9007 },
  UNPROCESSABLE_ENTITY: { code: 'UNPROCESSABLE_ENTITY', numericCode: 9008 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', numericCode: 9009 },

  // ── 1xxx Courses ──────────────────────────────────────────────────────────
  COURSE_NOT_FOUND: { code: 'COURSE_NOT_FOUND', numericCode: 1001 },
  COURSE_ALREADY_EXISTS: { code: 'COURSE_ALREADY_EXISTS', numericCode: 1002 },
  COURSE_INACTIVE: { code: 'COURSE_INACTIVE', numericCode: 1003 },

  // ── 2xxx Users ────────────────────────────────────────────────────────────
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', numericCode: 2001 },
  USER_BLOCKED: { code: 'USER_BLOCKED', numericCode: 2002 },
  USER_ALREADY_EXISTS: { code: 'USER_ALREADY_EXISTS', numericCode: 2003 },

  // ── 3xxx Auth ─────────────────────────────────────────────────────────────
  AUTH_TOKEN_EXPIRED: { code: 'AUTH_TOKEN_EXPIRED', numericCode: 3001 },
  AUTH_TOKEN_INVALID: { code: 'AUTH_TOKEN_INVALID', numericCode: 3002 },
  AUTH_INSUFFICIENT_ROLE: { code: 'AUTH_INSUFFICIENT_ROLE', numericCode: 3003 },

  // ── 4xxx Subscriptions ────────────────────────────────────────────────────
  SUBSCRIPTION_ALREADY_EXISTS: {
    code: 'SUBSCRIPTION_ALREADY_EXISTS',
    numericCode: 4001,
  },
  SUBSCRIPTION_NOT_FOUND: { code: 'SUBSCRIPTION_NOT_FOUND', numericCode: 4002 },

  // ── 5xxx Lessons (placeholder — reserved for Lessons team) ───────────────
  LESSON_NOT_FOUND: { code: 'LESSON_NOT_FOUND', numericCode: 5001 },

  // ── 8xxx Infrastructure / Database ───────────────────────────────────────
  DB_UNIQUE_VIOLATION: { code: 'DB_UNIQUE_VIOLATION', numericCode: 8001 },
  DB_FOREIGN_KEY_VIOLATION: {
    code: 'DB_FOREIGN_KEY_VIOLATION',
    numericCode: 8002,
  },
  DB_CONNECTION_ERROR: { code: 'DB_CONNECTION_ERROR', numericCode: 8003 },
} as const satisfies Record<string, ErrorCodeDefinition>;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeValue = (typeof ERROR_CODES)[ErrorCodeKey];
