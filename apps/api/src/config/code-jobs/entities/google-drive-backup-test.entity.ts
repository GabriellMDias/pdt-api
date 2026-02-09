import { ApiProperty } from "@nestjs/swagger";

export class GoogleDriveBackupTestEntity {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty()
  folderId!: string;

  @ApiProperty()
  folderName!: string;
}
