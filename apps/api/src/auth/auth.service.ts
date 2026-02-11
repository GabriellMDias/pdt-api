import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma/prisma.service';
import { PgService } from '../db/pg/pg.service';
import { AuthEntity } from './entity/auth.entity';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private pg: PgService,
    private jwtService: JwtService,
  ) {}

  async login(identifier: string, password: string): Promise<AuthEntity> {
    if (!identifier) {
      throw new BadRequestException(
        'Informe e-mail ou login do usuario no VRMaster.',
      );
    }

    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      throw new NotFoundException(
        `Nenhum usuario encontrado para o identificador informado: ${identifier}`,
      );
    }

    if (user.codigoUsuarioVrMaster == null) {
      throw new UnauthorizedException(
        'Usuario sem codigoUsuarioVrMaster vinculado.',
      );
    }

    if (!user.activeStatus) {
      throw new UnauthorizedException('Usuario inativo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha invalida');
    }

    return {
      accessToken: this.jwtService.sign({ userId: user.id }),
    };
  }

  private async findUserByIdentifier(identifier: string) {
    const normalized = identifier.trim();
    if (!normalized) return null;

    // 1) Tenta por e-mail (case insensitive)
    const userByEmail = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
    });
    if (userByEmail) {
      return userByEmail;
    }

    // 2) Tenta resolver o login no ERP e buscar o usuário vinculado no sistema
    const vrMasterUserId = await this.findVrMasterUserIdByLogin(normalized);
    if (!vrMasterUserId) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        codigoUsuarioVrMaster: vrMasterUserId,
      },
    });
  }

  private async findVrMasterUserIdByLogin(login: string): Promise<number | null> {
    const sql = `
      select id
      from usuario
      where id_situacaocadastro = 1
        and lower(login) = lower($1)
      order by id
      limit 1
    `;

    const result = await this.pg.query<{ id: number }, [string]>(sql, [login]);
    return result.rows[0]?.id ?? null;
  }
}
