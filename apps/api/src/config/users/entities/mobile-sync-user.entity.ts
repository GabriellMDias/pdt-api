import { ApiProperty } from '@nestjs/swagger';

export class MobileSyncPermissionEntity {
  @ApiProperty()
  code: string;
}

export class MobileSyncUserEntity {
  constructor(partial: Partial<MobileSyncUserEntity>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  login: string;

  @ApiProperty({
    description: 'Hash bcrypt da senha para validacao offline no mobile.',
  })
  passwordHash: string;

  @ApiProperty({ type: MobileSyncPermissionEntity, isArray: true })
  permissions: MobileSyncPermissionEntity[];

  @ApiProperty()
  updatedAt: string;
}

export class MobileSyncUsersPayloadEntity {
  @ApiProperty({ type: MobileSyncUserEntity, isArray: true })
  users: MobileSyncUserEntity[];

  @ApiProperty()
  syncVersion: number;

  @ApiProperty()
  syncedAt: string;
}
