import { PartialType } from '@nestjs/swagger';
import { CreateUserPermissionDto } from './create-user-permission.dto';

export class UpdateUserPermissionDto extends PartialType(CreateUserPermissionDto) {}
