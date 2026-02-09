import { ApiProperty } from '@nestjs/swagger';
import { CodeJobRunEntity } from './code-job-run.entity';

export class PaginatedCodeJobRunsEntity {
  @ApiProperty({ type: [CodeJobRunEntity] }) items!: CodeJobRunEntity[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() totalPages!: number;
}
