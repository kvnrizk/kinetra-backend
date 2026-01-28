import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Admin emails - in production, store this in database or use a proper role system
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase());

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
