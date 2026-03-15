export interface ValidationErrorDetail {
  field: string;
  constraints: Record<string, string>;
  // NOTE: `value` is intentionally omitted — never reflect user input back in error responses
}

export interface IApiErrorBody {
  statusCode: number;
  /** Domain-prefixed string code, e.g. 'COURSE_NOT_FOUND' */
  code: string;
  /** Numeric code for machine consumption, e.g. 1001 */
  numericCode: number;
  message: string;
  /** Populated for VALIDATION_ERROR only, null for all other errors */
  details: ValidationErrorDetail[] | null;
  /** Present in development mode only — never in production */
  stack?: string;
}

export interface IApiErrorMeta {
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
}

export interface IApiErrorResponse {
  success: false;
  error: IApiErrorBody;
  meta: IApiErrorMeta;
}
