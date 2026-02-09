import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GoogleDriveBackupRestoreDto {
  @ApiProperty({
    description: "ID do arquivo de backup (.dump) no Google Drive.",
  })
  @IsString()
  fileId!: string;
}
