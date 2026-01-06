import { ApiProperty } from '@nestjs/swagger';

export class DreEntity {
  @ApiProperty() recBruta: number;
  @ApiProperty() devolucao: number;
  @ApiProperty() imposto: number;
  @ApiProperty() custo: number;
  @ApiProperty() embalagem: number;
  @ApiProperty() quebra: number;
  @ApiProperty() recCom: number;
  @ApiProperty() despesaPessoal: number;
  @ApiProperty() despesaOperacional: number;
}

export class DreByCostCenterEntity {
  @ApiProperty() costCenterId: number;
  @ApiProperty({ type: DreEntity }) data: DreEntity;
}