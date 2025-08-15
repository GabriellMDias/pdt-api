import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiBearerAuth()
  @Permissions('users:incluir')
  @ApiCreatedResponse({type: UserEntity})
  async create(@Body() createUserDto: CreateUserDto) {
    return new UserEntity(await this.usersService.create(createUserDto));
  }

  @Get()
  @ApiBearerAuth()
  @Permissions('users:consultar')
  @ApiOkResponse({type: UserEntity, isArray: true})
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserEntity(user))
  }

  @Get(':id')
  @ApiBearerAuth()
  @Permissions('users:consultar')
  @ApiOkResponse({type: UserEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if(!user) {
      throw new NotFoundException(`User with ${id} does not exist.`)
    }
    return new UserEntity(user)
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Permissions('users:editar')
  @ApiCreatedResponse({type: UserEntity})
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return new UserEntity(await this.usersService.update(id, updateUserDto));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Permissions('users:excluir')
  @ApiOkResponse({type: UserEntity})
  async remove(@Param('id', ParseIntPipe) id: number) {
    return new UserEntity(await this.usersService.remove(id));
  }
}
