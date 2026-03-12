import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor() {}

  canActivate(_context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Placeholder: Checking roles (e.g. 'admin') is handled by another developer
    // It should extract roles metadata via Reflector and verify against the req.user object.
    return true;
  }
}
