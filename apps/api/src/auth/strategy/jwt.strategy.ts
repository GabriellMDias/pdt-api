import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/config/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { userId: number }) {
    const userWithPermissions = await this.usersService.findUserWithPermissions(
      payload.userId,
    );

    if (!userWithPermissions) {
      throw new UnauthorizedException();
    }

    if (!userWithPermissions.activeStatus) {
      throw new UnauthorizedException('Usuario inativo');
    }

    if (userWithPermissions.codigoUsuarioVrMaster == null) {
      throw new UnauthorizedException('Usuario sem codigoUsuarioVrMaster vinculado');
    }

    const isSuperAdmin = userWithPermissions.id === 0;
    const permissions = isSuperAdmin
      ? ['*']
      : userWithPermissions.UserPermission.map((p) => p.permission.code);

    return {
      id: userWithPermissions.id,
      email: userWithPermissions.email,
      permissions,
      codigoUsuarioVrMaster: userWithPermissions.codigoUsuarioVrMaster,
    };
  }
}
