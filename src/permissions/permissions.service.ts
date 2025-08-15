import { Injectable } from '@nestjs/common';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  findAllPermissions() {
    return this.prisma.permission.findMany();
  }

  async findPermissionsPerUser(userId: number) {
    const userPermissions = await this.prisma.userPermission.findMany({where: {userId}, include: {permission: true}})

    const result = {
      userId,
      permissions: userPermissions.map((up) => up.permission.code),
    };

    return result;
  }

  async updateUserPermission(userId: number, dto: UpdateUserPermissionDto) {
    const { permissionsCode, enable } = dto;

    // Busca os IDs das permissões baseados nos códigos
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: permissionsCode },
      },
    });

    const permissionIds = permissions.map((p) => p.id);

    if (enable) {
      // Adicionar permissões ao usuário (se ainda não existem)
      await Promise.all(
        permissionIds.map((permissionId) =>
          this.prisma.userPermission.upsert({
            where: {
              userId_permissionId: {
                userId,
                permissionId,
              },
            },
            update: {}, // nada a atualizar, se já existe
            create: {
              userId,
              permissionId,
            },
          }),
        ),
      );
    } else {
      // Remover permissões do usuário
      await Promise.all(
        permissionIds.map((permissionId) =>
          this.prisma.userPermission.deleteMany({
            where: {
              userId,
              permissionId,
            },
          }),
        ),
      );
    }

    // Retorna as permissões atualizadas do usuário
    const updated = await this.findPermissionsPerUser(userId);
    return updated;
  }
}
