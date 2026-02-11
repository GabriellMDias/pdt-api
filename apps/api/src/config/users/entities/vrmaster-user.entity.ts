import { ApiProperty } from '@nestjs/swagger';

export interface VrMasterUser {
  id: number;
  login: string;
  nome: string;
}

export class VrMasterUserEntity implements VrMasterUser {
  constructor(partial: Partial<VrMasterUserEntity>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  login: string;

  @ApiProperty()
  nome: string;
}
