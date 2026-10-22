import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Check if route is marked as @Public()
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return true;
    }

    const request = context.switchToHttp().getRequest();

    // 2. Extract token from Authorization header, query param (?token=...), or cookie
    const authHeader = request.headers.authorization;
    let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : undefined;
    if (!token && request.query?.token) {
      // [SECURITY] Token-in-query-string is deprecated — only allow in development
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        throw new UnauthorizedException('Token via query parameter is not allowed in production. Use Authorization header or cookie.');
      }
      token = (request.query.token as string).trim();
    }
    if (!token && request.cookies?.token) {
      token = (request.cookies.token as string).trim();
    }
    if (!token && request.cookies?.wa_token) {
      token = (request.cookies.wa_token as string).trim();
    }

    if (!token) {
      throw new UnauthorizedException('Missing Authorization header or token query parameter');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // Attach user to request
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
