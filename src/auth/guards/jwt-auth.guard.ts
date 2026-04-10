import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    sessionId: string;
  };
}

const HEADER_AUTH_VERSION = 'x-internal-auth-version';
const HEADER_USER_ID = 'x-internal-user-id';
const HEADER_SESSION_ID = 'x-internal-session-id';
const HEADER_ISSUED_AT = 'x-internal-issued-at';
const HEADER_EXPIRES_AT = 'x-internal-expires-at';
const HEADER_SIGNATURE = 'x-internal-signature';

const INTERNAL_AUTH_VERSION = 'v1';
const MAX_CLOCK_SKEW_SECONDS = 30;

const getHeaderString = (req: Request, headerName: string): string | null => {
  const value = req.headers[headerName];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
};

const parseUnixSeconds = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const createSignature = (payload: string, secret: string): Buffer =>
  Buffer.from(
    createHmac('sha256', secret).update(payload).digest('hex'),
    'utf8',
  );

const hasInternalAuthHeaders = (req: Request): boolean =>
  Boolean(
    getHeaderString(req, HEADER_USER_ID) ||
    getHeaderString(req, HEADER_SIGNATURE),
  );

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private unauthorized(message: string): never {
    throw new AppException(
      ERROR_CODES.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
      message,
    );
  }

  private getSecret(): string {
    const configuredSecret = process.env.INTERNAL_AUTH_BRIDGE_SECRET?.trim();
    if (!configuredSecret) {
      this.unauthorized(
        'Internal authentication is not configured on the backend server.',
      );
    }

    return configuredSecret;
  }

  private verifyAndAttachIdentity(req: AuthenticatedRequest): void {
    const authVersion = getHeaderString(req, HEADER_AUTH_VERSION);
    const userId = getHeaderString(req, HEADER_USER_ID);
    const sessionId = getHeaderString(req, HEADER_SESSION_ID);
    const issuedAt = parseUnixSeconds(getHeaderString(req, HEADER_ISSUED_AT));
    const expiresAt = parseUnixSeconds(getHeaderString(req, HEADER_EXPIRES_AT));
    const signature = getHeaderString(req, HEADER_SIGNATURE);

    if (
      !authVersion ||
      !userId ||
      !sessionId ||
      !issuedAt ||
      !expiresAt ||
      !signature
    ) {
      this.unauthorized('Missing required internal authentication headers.');
    }

    if (authVersion !== INTERNAL_AUTH_VERSION) {
      this.unauthorized('Unsupported internal authentication version.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (issuedAt > now + MAX_CLOCK_SKEW_SECONDS) {
      this.unauthorized('Internal authentication token is not valid yet.');
    }

    if (expiresAt < now - MAX_CLOCK_SKEW_SECONDS) {
      this.unauthorized('Internal authentication token has expired.');
    }

    const payload = `${userId}.${sessionId}.${issuedAt}.${expiresAt}`;
    const expectedSignature = createSignature(payload, this.getSecret());
    const providedSignature = Buffer.from(signature, 'utf8');

    if (
      expectedSignature.length !== providedSignature.length ||
      !timingSafeEqual(expectedSignature, providedSignature)
    ) {
      this.unauthorized('Invalid internal authentication signature.');
    }

    req.user = {
      id: userId,
      sessionId,
    };
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.verifyAndAttachIdentity(req);
    return true;
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly strictGuard = new JwtAuthGuard();

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    if (hasInternalAuthHeaders(req)) {
      return this.strictGuard.canActivate(context);
    }

    return true;
  }
}
