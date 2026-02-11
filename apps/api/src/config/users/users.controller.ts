import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { VrMasterUserEntity } from './entities/vrmaster-user.entity';
import { MobileSyncUsersPayloadEntity } from './entities/mobile-sync-user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsAny } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('users:incluir')
  @ApiCreatedResponse({type: UserEntity})
  async create(@Body() createUserDto: CreateUserDto) {
    return new UserEntity(await this.usersService.create(createUserDto));
  }

  @Get()
  @PermissionsAny('users:consultar', 'permissions:consultar')
  @ApiOkResponse({type: UserEntity, isArray: true})
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserEntity(user))
  }

  @Get('vrmaster')
  @PermissionsAny('users:consultar', 'permissions:consultar')
  @ApiOkResponse({ type: VrMasterUserEntity, isArray: true })
  async findVrMasterUsers() {
    const users = await this.usersService.findVrMasterUsers();
    return users.map((user) => new VrMasterUserEntity(user));
  }

  @Get('mobile-sync')
  @ApiOkResponse({ type: MobileSyncUsersPayloadEntity })
  async findUsersForMobileSync() {
    return this.usersService.findUsersForMobileSync();
  }

  @Get(':id')
  @PermissionsAny('users:consultar', 'permissions:consultar')
  @ApiOkResponse({type: UserEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if(!user) {
      throw new NotFoundException(`User with ${id} does not exist.`)
    }
    return new UserEntity(user)
  }

  @Patch(':id')
  @Permissions('users:editar')
  @ApiCreatedResponse({type: UserEntity})
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return new UserEntity(await this.usersService.update(id, updateUserDto));
  }

  @Delete(':id')
  @Permissions('users:excluir')
  @ApiOkResponse({type: UserEntity})
  async remove(@Param('id', ParseIntPipe) id: number) {
    return new UserEntity(await this.usersService.remove(id));
  }
}
