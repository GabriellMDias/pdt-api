import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export const roundsOfHashing = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
