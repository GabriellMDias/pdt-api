import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GoogleDriveFolderEntity } from "./google-drive-folder.entity";

export class GoogleDriveFolderListEntity {
  @ApiProperty()
  parentId!: string;

  @ApiProperty({ type: [GoogleDriveFolderEntity] })
  items!: GoogleDriveFolderEntity[];

  @ApiPropertyOptional()
  nextPageToken?: string | null;
}
