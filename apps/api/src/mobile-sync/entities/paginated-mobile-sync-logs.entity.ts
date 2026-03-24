import { ApiProperty } from '@nestjs/swagger';
import { MobileSyncLogEntity } from './mobile-sync-log.entity';

export class PaginatedMobileSyncLogsEntity {
  @ApiProperty({ type: MobileSyncLogEntity, isArray: true })
  items!: MobileSyncLogEntity[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalPages!: number;
}
