import { ApiProperty } from '@nestjs/swagger';

export class DiferencaCustoMedioxUltimoNoDiaEntity {
  @ApiProperty({ type: Number, description: 'ID da loja' })
  id_loja!: number;

  @ApiProperty({ type: Number, description: 'ID do produto' })
  id_produto!: number;

  @ApiProperty({ type: String, description: 'Data/hora do evento (ISO)' })
  data!: string;

  @ApiProperty({ type: Number, description: 'Diferenca calculada no evento' })
  diferenca!: number;
}
