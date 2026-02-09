import { ApiProperty } from "@nestjs/swagger";

export class GoogleDriveFolderEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  parents!: string[];
}
