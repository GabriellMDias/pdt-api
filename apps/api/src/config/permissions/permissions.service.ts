// src/permissions/permissions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { getPermissionGroupPath } from './permission-groups';

type UserPermissionView = {
  code: string;
  global: boolean;
  stores: number[];
  useStorePermission: boolean;
  groupPath: string;
};

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  findAllPermissions() {
    // útil para montar catálogo no front
    return this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    }).then((items) => items.map((item) => ({
      ...item,
      groupPath: getPermissionGroupPath(item.code),
    })));
  }

  async findPermissionsPerUser(userId: number) {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    // Agrupa por code e monta visão global/lojas
    const map = new Map<string, UserPermissionView>();
    for (const r of rows) {
      const code = r.permission.code;
      if (!map.has(code)) {
        map.set(code, {
          code,
          global: false,
          stores: [],
          useStorePermission: Boolean(r.permission.useStorePermission),
          groupPath: getPermissionGroupPath(code),
        });
      }
      const item = map.get(code)!;
      if (r.storeId == null) {
        item.global = true;
      } else {
        if (!item.stores.includes(r.storeId)) item.stores.push(r.storeId);
      }
    }

    // Permissões com `useStorePermission = true` que o usuário não tem ainda não aparecem.
    // Se quiser forçar a aparecer todas com valor "vazio", descomente:
    // const all = await this.prisma.permission.findMany();
    // for (const p of all) if (!map.has(p.code)) {
    //   map.set(p.code, { code: p.code, global: false, stores: [], useStorePermission: p.useStorePermission });
    // }

    const permissions = Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    return { userId, permissions };
  }

  async updateUserPermission(userId: number, dto: UpdateUserPermissionDto) {
    const { permissionsCode, enable, storeId } = dto;

    // Resolve IDs e valida códigos inexistentes
    const perms = await this.prisma.permission.findMany({
      where: { code: { in: permissionsCode } },
      select: { id: true, code: true },
    });
    if (perms.length !== permissionsCode.length) {
      const found = new Set(perms.map(p => p.code));
      const missing = permissionsCode.filter(c => !found.has(c));
      throw new NotFoundException(`Código(s) de permissão inválido(s): ${missing.join(', ')}`);
    }
    const permissionIds = perms.map(p => p.id);

    await this.prisma.$transaction(async (tx) => {
      if (enable) {
        if (storeId == null) {
          // GLOBAL: não dá pra usar where unique com null => find/create
          for (const permissionId of permissionIds) {
            const exists = await tx.userPermission.findFirst({
              where: { userId, permissionId, storeId: null },
              select: { id: true },
            });
            if (!exists) {
              await tx.userPermission.create({
                data: { userId, permissionId, storeId: null },
              });
            }
          }
        } else {
          // POR LOJA: usa unique composta [userId, permissionId, storeId]
          for (const permissionId of permissionIds) {
            await tx.userPermission.upsert({
              where: { userId_permissionId_storeId: { userId, permissionId, storeId } },
              update: {},
              create: { userId, permissionId, storeId },
            });
          }
        }
      } else {
        // DESABILITAR
        await tx.userPermission.deleteMany({
          where: {
            userId,
            permissionId: { in: permissionIds },
            ...(storeId == null ? { storeId: null } : { storeId }),
          },
        });
      }
    });

    return this.findPermissionsPerUser(userId);
  }
}
