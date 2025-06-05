import { Body, Controller, Post } from '@nestjs/common';
import { DreService } from './dre.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import StoreSalesEntity from './entities/store-sales.entity';
import { GetStoresSalesDto } from './dto/get-store-sales.dto';
import CostCenterSaleEntity from './entities/cost-center-sales.entity';
import { GetCostCenterSalesDto } from './dto/get-cost-center-sales.dto';
import { GetCouponReturnDto } from './dto/get-coupon-return.dto';
import { GetPackagingCostDto } from './dto/get-packaging-cost.dto';
import { GetLossAndConsumptionDto } from './dto/get-loss-and-consumption.dto';
import { GetConsolidatedDreDto } from './dto/get-consolidated-dre';
import { GetCommercialRevenueDto } from './dto/get-commercial-revenue.dto';

@Controller('dre')
@ApiTags('dre')
export class DreController {
  constructor(private readonly dreService: DreService) {}

  @Post('store-sales')
  @ApiOkResponse({type: StoreSalesEntity, isArray: true})
  getStoresSales(@Body() getSoreSalesDto: GetStoresSalesDto) {
    return this.dreService.getStoresSales(getSoreSalesDto);
  }

  @Post('cost-center-sales')
  @ApiOkResponse({type: CostCenterSaleEntity, isArray: true})
  getCostCenterSales(@Body() getCostCenterSales: GetCostCenterSalesDto) {
    return this.dreService.getCostCenterSales(getCostCenterSales)
  }

  @Post('coupon-return')
  @ApiOkResponse({type: GetCouponReturnDto, isArray: true})
  getCouponReturn(@Body() getCouponReturnDto: GetCouponReturnDto) {
    return this.dreService.getCouponReturn(getCouponReturnDto)
  }

  @Post('packaging-cost')
  @ApiOkResponse({type: GetPackagingCostDto})
  getPackagingCost(@Body() getPackagingCostDto: GetPackagingCostDto){
    return this.dreService.getPackagingCost(getPackagingCostDto)
  }

  @Post('loss-and-consumption')
  @ApiOkResponse({type: GetLossAndConsumptionDto, isArray: true})
  getLossAndConsumption(@Body() getLossAndConsumptionDto: GetLossAndConsumptionDto) {
    return this.dreService.getLossAndConsumption(getLossAndConsumptionDto)
  }

  @Post('commercial-revenue')
  @ApiOkResponse({type: GetCommercialRevenueDto, isArray: true})
  getCommercialRevenue(@Body() getCommercialRevenueDto: GetCommercialRevenueDto) {
    this.dreService.getCommercialRevenue(getCommercialRevenueDto)
  }

  @Post('consolidated-dre')
  @ApiOkResponse({type: GetConsolidatedDreDto, isArray: true})
  getConsolidatedDre(@Body() getConsolidatedDreDto: GetConsolidatedDreDto) {
    this.dreService.getConsolidatedDre(getConsolidatedDreDto)
  }
}
