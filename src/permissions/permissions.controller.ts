import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionEntity } from './entities/permission.entity';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { UserPermissionEntity } from './entities/user-permission.entity';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
@ApiTags('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}


  /* Shows the all the permissions of every user */
  @Get()
  @ApiBearerAuth()
  @Permissions('permissions:consultar')
  @ApiOkResponse({type: PermissionEntity, isArray: true})
  findAllPermissions() {
    return this.permissionsService.findAllPermissions();
  }

  /* Shows the permissions of a specific user */
  @Get(':userId')
  @ApiBearerAuth()
  @Permissions('permissions:consultar')
  @ApiOkResponse({type: UserPermissionEntity})
  findPermissionsPerUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.permissionsService.findPermissionsPerUser(userId);
  }


  /* Enable or Disable one or more permissions of a specific user */
  @Patch(':userId')
  @ApiBearerAuth()
  @Permissions('permissions:editar')
  @ApiCreatedResponse({type: UserPermissionEntity, isArray: true})
  update(@Param('userId', ParseIntPipe) userId: number, @Body() updateUserPermissionDto: UpdateUserPermissionDto) {
    return this.permissionsService.updateUserPermission(userId, updateUserPermissionDto);
  }
}
