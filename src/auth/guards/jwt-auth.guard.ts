import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(
    _context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Placeholder: Auth is handled by another developer
    return true;
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  canActivate(
    _context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Placeholder: Optional Auth
    return true;
  }
}
