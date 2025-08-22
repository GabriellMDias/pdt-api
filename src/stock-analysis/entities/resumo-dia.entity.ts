import { ApiProperty } from '@nestjs/swagger';

export class ResumoDiaEntity {
  @ApiProperty({ type: String, description: 'Timestamp agregado ao segundo' })
  data!: string; // ISO datetime

  @ApiProperty({ type: Number })
  custo_total_anterior!: number;

  @ApiProperty({ type: Number })
  custo_total_final!: number;

  @ApiProperty({ type: Number })
  dif_custo_total!: number;
}
