import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCESS_COOKIE } from './auth-cookies.js';
import { SKIP_CSRF_KEY } from './skip-csrf.decorator.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-requested-with';
const CSRF_VALUE = 'ApproveFlow';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const hasBearerAuth = Boolean(
      request.headers.authorization?.startsWith('Bearer '),
    );
    const hasCookieAuth = Boolean(request.cookies?.[ACCESS_COOKIE]);
    if (hasBearerAuth && !hasCookieAuth) {
      return true;
    }

    if (request.headers[CSRF_HEADER] === CSRF_VALUE) {
      return true;
    }

    throw new ForbiddenException('Missing CSRF protection header');
  }
}
