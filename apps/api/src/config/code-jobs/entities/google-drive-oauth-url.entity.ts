import { ApiProperty } from "@nestjs/swagger";

export class GoogleDriveOauthUrlEntity {
  @ApiProperty()
  authUrl!: string;
}
