import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GoogleDriveBackupFileEntity } from "./google-drive-backup-file.entity";

export class GoogleDriveBackupFileListEntity {
  @ApiProperty()
  folderId!: string;

  @ApiProperty({ type: [GoogleDriveBackupFileEntity] })
  items!: GoogleDriveBackupFileEntity[];

  @ApiPropertyOptional()
  nextPageToken?: string | null;
}
