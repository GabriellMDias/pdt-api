import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PgService } from '../../db/pg/pg.service';
import { PrismaService } from '../../db/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VrMasterUser } from './entities/vrmaster-user.entity';
import { MobileSyncUsersPayloadEntity } from './entities/mobile-sync-user.entity';

export const roundsOfHashing = 10;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private pg: PgService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      roundsOfHashing,
    );

    createUserDto.password = hashedPassword;

    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findUserWithPermissions(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        UserPermission: {
          include: { permission: true },
        },
      },
    });
  }

  async findVrMasterUsers(): Promise<VrMasterUser[]> {
    const getUsersQuery = `
      select
        id,
        login,
        nome
      from usuario
      where id_situacaocadastro = 1
      order by nome, id
    `;

    const result = await this.pg.query<VrMasterUser>(getUsersQuery);
    return result.rows;
  }

  async findUsersForMobileSync(): Promise<MobileSyncUsersPayloadEntity> {
    const users = await this.prisma.user.findMany({
      where: {
        activeStatus: true,
        codigoUsuarioVrMaster: { not: null },
      },
      include: {
        UserPermission: {
          include: {
            permission: {
              select: { code: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const vrMasterIds = users
      .map((user) => user.codigoUsuarioVrMaster)
      .filter((value): value is number => value !== null);

    const vrMasterLogins = await this.findVrMasterLoginsById(vrMasterIds);

    const syncedAt = new Date().toISOString();
    return {
      users: users.map((user) => {
        const permissions = Array.from(
          new Set(user.UserPermission.map((entry) => entry.permission.code)),
        ).map((code) => ({ code }));

        const login =
          (user.codigoUsuarioVrMaster != null &&
            vrMasterLogins.get(user.codigoUsuarioVrMaster)) ||
          user.email;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          login,
          passwordHash: user.password,
          permissions,
          updatedAt: user.createdAt.toISOString(),
        };
      }),
      syncVersion: 1,
      syncedAt,
    };
  }

  private async findVrMasterLoginsById(
    vrMasterIds: number[],
  ): Promise<Map<number, string>> {
    if (vrMasterIds.length === 0) {
      return new Map();
    }

    const sql = `
      select
        id,
        login
      from usuario
      where id = any($1::int[])
    `;

    const result = await this.pg.query<{ id: number; login: string }, [number[]]>(
      sql,
      [vrMasterIds],
    );

    return new Map(
      result.rows
        .filter((row) => Boolean(row.login))
        .map((row) => [row.id, row.login.trim()]),
    );
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (id === 0 && updateUserDto.activeStatus === false) {
      throw new ForbiddenException(
        'Nao e permitido inativar o usuario administrador (id = 0).',
      );
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        roundsOfHashing,
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: number) {
    if (id === 0) {
      throw new ForbiddenException(
        'Nao e permitido excluir o usuario administrador (id = 0).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId: id } });
      await tx.notificationRecipient.deleteMany({ where: { userId: id } });
      return tx.user.delete({ where: { id } });
    });
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ${userId} does not exist.`);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual invalida');
    }

    const hashedPassword = await bcrypt.hash(newPassword, roundsOfHashing);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
