import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GoogleDriveBackupFileEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({
    description: "Data de criacao (ISO 8601).",
  })
  createdTime?: string | null;

  @ApiPropertyOptional({
    description: "Tamanho do arquivo em bytes.",
    type: Number,
  })
  sizeBytes?: number | null;
}
