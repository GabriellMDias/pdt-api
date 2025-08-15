import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService, private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { userId: number }) {
    const userWithPermissions = await this.usersService.findUserWithPermissions(payload.userId)

     // ✅ Se for o super admin, libera tudo
    const isSuperAdmin = userWithPermissions.id === 0;

    const permissions = isSuperAdmin
      ? ['*'] // o guard pode interpretar isso como "acesso total"
      : userWithPermissions.UserPermission.map((p) => p.permission.code);

    if (!userWithPermissions) {
      throw new UnauthorizedException();
    }

    return {
      id: userWithPermissions.id,
      email: userWithPermissions.email,
      permissions, // ['users:consultar', 'users:incluir', ...]
    };
  }
}