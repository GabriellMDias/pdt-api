import { ApiProperty } from '@nestjs/swagger';

export class ResumoMesEntity {
  @ApiProperty({ type: String, description: 'Dia (date) agregado' })
  data!: string; // ISO date (YYYY-MM-DD)

  @ApiProperty({ type: Number })
  custo_total_anterior!: number;

  @ApiProperty({ type: Number })
  custo_total_final!: number;

  @ApiProperty({ type: Number })
  dif_custo_total!: number;
}
