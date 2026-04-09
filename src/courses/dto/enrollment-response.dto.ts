export type EnrollmentErrorCode =
  | 'auth_required'
  | 'already_enrolled'
  | 'course_not_found'
  | 'payment_unavailable'
  | 'validation_failure'
  | 'network_transient'
  | 'unknown';

export type EnrollmentNextAction =
  | 'none'
  | 'resume_learning'
  | 'checkout'
  | 'application';

export interface EnrollmentApiResponse<TData> {
  success: boolean;
  code: string;
  message: string;
  data: TData;
  requestId: string;
}
