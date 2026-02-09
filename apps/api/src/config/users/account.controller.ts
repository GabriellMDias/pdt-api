import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('account')
@ApiTags('account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserEntity })
  async me(@Req() req: any) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return new UserEntity(user);
  }

  @Patch('password')
  @ApiOkResponse()
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('A confirmação da senha não confere');
    }

    await this.usersService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );

    return { message: 'Senha alterada com sucesso' };
  }
}
