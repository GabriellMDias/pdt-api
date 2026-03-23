import { ApiProperty } from '@nestjs/swagger';

export class MobileSyncCatalogProductEntity {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true, required: false })
  barcode: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true, required: false })
  packageQuantity: number | null;

  @ApiProperty({ nullable: true, required: false })
  packagingTypeId: number | null;

  @ApiProperty({ nullable: true, required: false })
  packagingDescription: string | null;

  @ApiProperty({ nullable: true, required: false })
  shelfCode: string | null;

  @ApiProperty()
  activeStatus: boolean;

  @ApiProperty({ required: false })
  decimalAllowed?: boolean;

  @ApiProperty({ nullable: true, required: false })
  salePrice?: number | null;

  @ApiProperty({ nullable: true, required: false })
  stockQuantity?: number | null;

  @ApiProperty({ nullable: true, required: false })
  exchangeQuantity?: number | null;

  @ApiProperty({ nullable: true, required: false })
  averageCostWithTax?: number | null;

  @ApiProperty({ nullable: true, required: false })
  grossWeight?: number | null;
}

export class MobileSyncExchangeReasonEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  activeStatus: boolean;
}

export class MobileSyncProductionRecipeEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  activeStatus: boolean;

  @ApiProperty({
    type: 'object',
    isArray: true,
    additionalProperties: true,
  })
  outputs: Array<{
    recipeOutputId: number;
    productId: number;
    yieldQuantity: number | null;
  }>;

  @ApiProperty()
  inputs: Array<{
    recipeInputId: number;
    productId: number;
    recipePackageQuantity: number | null;
    productPackageQuantity: number | null;
    deductStock: boolean;
    conversionFactor: number | null;
  }>;
}

export class MobileSyncBalanceHeaderEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  stockLabel: string;

  @ApiProperty()
  statusCode: number;
}

export class MobileSyncCatalogPullResponseEntity {
  @ApiProperty({ enum: ['rupture.products', 'stock.products', 'exchange.reasons', 'consumption.reasons', 'production.recipes', 'balance.headers'] })
  domain: string;

  @ApiProperty()
  storeId: number;

  @ApiProperty()
  syncedAt: string;

  @ApiProperty({ nullable: true, required: false })
  cursor: string | null;

  @ApiProperty({ type: 'object', isArray: true, additionalProperties: true })
  items: Array<
    MobileSyncCatalogProductEntity |
    MobileSyncExchangeReasonEntity |
    MobileSyncProductionRecipeEntity |
    MobileSyncBalanceHeaderEntity
  >;
}
