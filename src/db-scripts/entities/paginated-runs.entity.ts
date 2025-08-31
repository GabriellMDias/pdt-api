import { ApiProperty } from '@nestjs/swagger';
import { DbScriptRunEntity } from './db-script-run.entity';

export class DbScriptRunPaginatedEntity {
  @ApiProperty({ type: [DbScriptRunEntity] })
  items!: DbScriptRunEntity[];

  @ApiProperty({ example: 200 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  pageSize!: number;

  @ApiProperty({ example: 4 })
  totalPages!: number;
}
