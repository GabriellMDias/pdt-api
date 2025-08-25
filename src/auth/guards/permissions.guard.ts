// src/auth/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();

    // ALL (E) e ANY (OU)
    const requiredAll = this.reflector.get<string[]>('permissions', handler) ?? [];
    const requiredAny = this.reflector.get<string[]>('permissions:any', handler) ?? [];

    // Se não exigiu nada, libera
    if (requiredAll.length === 0 && requiredAny.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const uid = Number(req.user?.id ?? req.user?.userId);

    console.log(uid)


    // bypass admin ou token com '*'
    if (uid === 0 || req.user?.permissions?.includes?.('*')) return true;

    // Busca no banco somente os códigos que interessam (ALL ∪ ANY)
    const toCheck = Array.from(new Set([...requiredAll, ...requiredAny]));
    if (toCheck.length === 0) return true;

    const rows = await this.prisma.userPermission.findMany({
      where: { userId: uid, permission: { code: { in: toCheck } } },
      select: { permission: { select: { code: true } } },
    });

    const got = new Set(rows.map(r => r.permission.code));

    const hasAll = requiredAll.every(code => got.has(code));
    const hasAny = requiredAny.length === 0 || requiredAny.some(code => got.has(code));

    const ok = hasAll && hasAny;
    if (!ok) throw new ForbiddenException('Você não tem permissão.');

    return true;
  }
}
