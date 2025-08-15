import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserPayload } from '../types/user-payload.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as UserPayload;

    const userPermissions: string[] = user?.permissions || [];

    const hasPermission = 
    userPermissions.includes('*') || // super admin 
    requiredPermissions.every(p =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão.');
    }

    return true;
  }
}
