import { ApiProperty } from '@nestjs/swagger';

export class DiferencaCustoMedioxUltimoDiarioEntity {
  @ApiProperty({ type: String, description: 'Dia agregado (YYYY-MM-DD)' })
  data!: string;

  @ApiProperty({ type: Number, description: 'Quantidade de registros no dia' })
  qtd_registros!: number;

  @ApiProperty({ type: Number, description: 'Soma da diferenca no dia' })
  diferenca_total!: number;

  @ApiProperty({ type: Number, description: 'Soma absoluta da diferenca no dia' })
  diferenca_absoluta_total!: number;
}
