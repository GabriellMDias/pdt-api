import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class PullMobileSyncCatalogDto {
  @IsIn(['rupture.products', 'stock.products', 'exchange.reasons', 'consumption.reasons', 'production.recipes', 'balance.headers'])
  @ApiProperty({ enum: ['rupture.products', 'stock.products', 'exchange.reasons', 'consumption.reasons', 'production.recipes', 'balance.headers'] })
  domain: 'rupture.products' | 'stock.products' | 'exchange.reasons' | 'consumption.reasons' | 'production.recipes' | 'balance.headers';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  storeId: number;
}
