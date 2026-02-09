import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GoogleDriveBackupConfigEntity {
  @ApiProperty()
  hasClientId!: boolean;

  @ApiProperty()
  hasClientSecret!: boolean;

  @ApiProperty()
  hasRefreshToken!: boolean;

  @ApiProperty()
  hasFolderId!: boolean;

  @ApiPropertyOptional()
  clientIdPreview?: string | null;

  @ApiPropertyOptional()
  clientSecretPreview?: string | null;

  @ApiPropertyOptional()
  refreshTokenPreview?: string | null;

  @ApiPropertyOptional({
    description: "ID da pasta de destino no Google Drive.",
  })
  folderId?: string | null;
}
