import { ApiProperty } from "@nestjs/swagger"

export interface CouponReturn {
    costCenterId: number
    totalValue: number
    icmsValue: number
    pisCofinsValue: number
}

export default class CouponReturnEntity implements CouponReturn {
    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    totalValue: number;

    @ApiProperty()
    icmsValue: number;

    @ApiProperty()
    pisCofinsValue: number;
}
