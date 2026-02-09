import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpsertGoogleDriveBackupConfigDto {
  @ApiPropertyOptional({
    description: "OAuth Client ID do Google (Drive API).",
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: "OAuth Client Secret do Google (Drive API).",
  })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({
    description: "ID da pasta do Google Drive onde os backups serão gravados.",
  })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({
    description: "Refresh token OAuth 2.0 com acesso ao Google Drive.",
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
