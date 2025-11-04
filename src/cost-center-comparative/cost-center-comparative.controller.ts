import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { CostCenterComparativeEntity } from './entities/cost-center-comparative.entity';
import { CostCenterComparativeService } from './cost-center-comparative.service';
import { CompareMode, CostCenterComparativeQueryDto } from './dto/cost-center-comparative.query.dto';

@Controller('cost-center-comparative')
@ApiTags('cost-center-comparative')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiExtraModels(CostCenterComparativeEntity)
export class CostCenterComparativeController {
    constructor(private readonly costCenterComparativeService: CostCenterComparativeService) {}

    @ApiQuery({ name: 'storeId', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 2, 5] })
    @ApiQuery({ name: 'initialDate', required: true, type: String, example: '2025-05-01' })
    @ApiQuery({ name: 'finalDate', required: true, type: String, example: '2025-10-26' })
    @ApiQuery({name: 'mode', required: true, enum: CompareMode, enumName: 'CompareMode'})
    @Get('')
    @Permissions("cost-center-comparative:consultar")
    @ApiOkResponse({ type: CostCenterComparativeEntity, isArray: true })
    getStoresSales(
      @Query(new ValidationPipe({ transform: true })) dto: CostCenterComparativeQueryDto,
    ) {
      return this.costCenterComparativeService.getCostCenterComparative(dto);
    }
}
