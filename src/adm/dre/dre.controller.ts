import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { DreService } from './dre.service';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import StoreSalesEntity from './entities/store-sales.entity';
import { GetStoresSalesQueryDto } from './dto/get-store-sales.query.dto';
import CostCenterSaleEntity from './entities/cost-center-sales.entity';
import { GetCostCenterSalesQueryDto } from './dto/get-cost-center-sales.query.dto';
import { GetCouponReturnQueryDto } from './dto/get-coupon-return.query.dto';
import { GetPackagingCostQueryDto } from './dto/get-packaging-cost.query.dto';
import { GetLossAndConsumptionQueryDto } from './dto/get-loss-and-consumption.query.dto';
import { GetConsolidatedDreQueryDto } from './dto/get-consolidated-dre.query.dto';
import { GetCommercialRevenueQueryDto } from './dto/get-commercial-revenue.query.dto';
import { GetNotConsolidatedDreQueryDto } from './dto/get-not-consolidated-dre.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MonthlyResultEntity } from './entities/get-consolidated-dre.entity';
import { CreateMonthlyResultDto } from './dto/create-monthly-result.dto';
import { UpdateMonthlyResultDto } from './dto/update-monthly-result.dto';
import { DreByCostCenterEntity, DreEntity } from './entities/dre.entity';
import CouponReturnEntity from './entities/get-coupon-return.entity';
import PackagingCostEntity from './entities/get-packaging-cost.entity';
import LossAndComsumptionEntity from './entities/get-loss-and-comsumption.entity';
import CommercialRevenueEntity from './entities/get-commercial-revenue.entity';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';

@Controller('dre')
@ApiTags('dre')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiExtraModels(DreByCostCenterEntity, DreEntity, StoreSalesEntity, CostCenterSaleEntity, CouponReturnEntity, PackagingCostEntity, LossAndComsumptionEntity, CommercialRevenueEntity, MonthlyResultEntity, DreByCostCenterEntity, DreEntity)
export class DreController {
  constructor(private readonly dreService: DreService) {}

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('store-sales')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: StoreSalesEntity, isArray: true })
  getStoresSales(
    @Query(new ValidationPipe({ transform: true })) dto: GetStoresSalesQueryDto,
  ) {
    return this.dreService.getStoresSales(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('cost-center-sales')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: CostCenterSaleEntity, isArray: true })
  getCostCenterSales(
    @Query(new ValidationPipe({ transform: true })) dto: GetCostCenterSalesQueryDto,
  ) {
    console.log("DTO: ", dto)
    return this.dreService.getCostCenterSales(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('coupon-return')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: CouponReturnEntity, isArray: true })
  getCouponReturn(
    @Query(new ValidationPipe({ transform: true })) dto: GetCouponReturnQueryDto,
  ) {
    return this.dreService.getCouponReturn(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('packaging-cost')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: PackagingCostEntity, isArray: true })
  getPackagingCost(
    @Query(new ValidationPipe({ transform: true })) dto: GetPackagingCostQueryDto,
  ) {
    return this.dreService.getPackagingCost(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @ApiQuery({ name: 'considerNegativeValues', required: false, type: Boolean, example: true })
  @Get('loss-and-consumption')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: LossAndComsumptionEntity, isArray: true })
  getLossAndConsumption(
    @Query(new ValidationPipe({ transform: true })) dto: GetLossAndConsumptionQueryDto,
  ) {
    return this.dreService.getLossAndConsumption(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('commercial-revenue')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: CommercialRevenueEntity, isArray: true })
  getCommercialRevenue(
    @Query(new ValidationPipe({ transform: true })) dto: GetCommercialRevenueQueryDto,
  ) {
    return this.dreService.getCommercialRevenue(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('consolidated-dre')
  @Permissions("dre:consultar")
  @ApiOkResponse({ type: DreByCostCenterEntity, isArray: true })
  async getConsolidatedDre(
    @Query(new ValidationPipe({ transform: true })) dto: GetConsolidatedDreQueryDto,
  ) {
    const rows = await this.dreService.getConsolidatedDre(dto);
    // O service retorna: [{ costCenterId, _sum: { recBruta, devolucao, ... } }]
    return rows.map((r: any) => ({
      costCenterId: r.costCenterId,
      data: {
        recBruta: r._sum.recBruta ?? 0,
        devolucao: r._sum.devolucao ?? 0,
        imposto: r._sum.imposto ?? 0,
        custo: r._sum.custo ?? 0,
        embalagem: r._sum.embalagem ?? 0,
        quebra: r._sum.quebra ?? 0,
        recCom: r._sum.recCom ?? 0,
        despesaPessoal: r._sum.despesaPessoal ?? 0,
        despesaPessoalRat: r._sum.despesaPessoalRat ?? 0,
        despesaOperacional: r._sum.despesaOperacional ?? 0,
      } as DreEntity,
    }));
  }

  // Documenta query params para o Swagger UI
  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('not-consolidated-dre')
  @Permissions("dre:consultar")
  @ApiOkResponse({
    schema: { type: 'array', items: { $ref: getSchemaPath(DreByCostCenterEntity) } },
  })
  getNotConsolidatedDre(
    @Query(new ValidationPipe({ transform: true })) dto: GetNotConsolidatedDreQueryDto,
  ) {
    return this.dreService.getNotConsolidatedDre(dto);
  }

  @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
  @ApiQuery({ name: 'costCenterId', required: false, type: Number, isArray: true, style: 'form', explode: true, example: [3] })
  @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
  @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
  @Get('unified')
  @Permissions("dre:consultar")
  @ApiOkResponse({
    schema: { type: 'array', items: { $ref: getSchemaPath(DreByCostCenterEntity) } },
  })
  getUnified(
    @Query(new ValidationPipe({ transform: true })) dto: GetNotConsolidatedDreQueryDto,
  ) {
    return this.dreService.getUnifiedDre(dto);
  }

  @Post()
  @Permissions("dre:consolidar")
  @ApiCreatedResponse({type: MonthlyResultEntity, isArray: true})
  @ApiBody({ type: [CreateMonthlyResultDto] })
  create(@Body() createMonthlyResultDto: CreateMonthlyResultDto[]) {
    return this.dreService.create(createMonthlyResultDto);
  }
  
  @Get()
  @Permissions("dre:consultar")
  @ApiOkResponse({type: MonthlyResultEntity, isArray: true})
  findAll() {
    return this.dreService.findAll();
  }
  
  @Get(':id')
  @Permissions("dre:consultar")
  @ApiOkResponse({type: MonthlyResultEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const monthlyResult = await this.dreService.findOne(id);

    if(!monthlyResult) {
      throw new NotFoundException(`MonthlyResult with ${id} does not exist.`)
    }

    return monthlyResult
  }
  
  @Patch(':id')
  @Permissions("dre:consolidar")
  @ApiCreatedResponse({type: MonthlyResultEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMonthlyResultDto: UpdateMonthlyResultDto) {
    return this.dreService.update(id, updateMonthlyResultDto);
  }

  @Delete(':id')
  @Permissions("dre:consolidar")
  @ApiOkResponse({type: MonthlyResultEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dreService.remove(id);
  }
}
