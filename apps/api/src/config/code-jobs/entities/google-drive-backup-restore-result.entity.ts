import { ApiProperty } from "@nestjs/swagger";

export class GoogleDriveBackupRestoreResultEntity {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  database!: string;

  @ApiProperty({
    description: "Timestamp ISO da restauracao.",
  })
  restoredAt!: string;
}
