import { Controller, Get, Param, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { GetRecBrutaDetailsQueryDto } from './dto/get-rec-bruta-details.query.dto';
import { ResultLinesService } from './result-lines.service';

@Controller('dre/result-lines')
@ApiTags('dre')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ResultLinesController {
  constructor(private readonly service: ResultLinesService) {}

  @Get('recBruta/details')
  @Permissions('dre:consultar')
  @ApiQuery({ name: 'initialDate', required: true, example: '2026-03-01' })
  @ApiQuery({ name: 'finalDate', required: true, example: '2026-03-31' })
  @ApiQuery({ name: 'storeIds', required: false, example: '1,5' })
  @ApiQuery({ name: 'storeId', required: false, example: '1,5' })
  @ApiQuery({ name: 'costCenterIds', required: false, example: '3,8,9' })
  @ApiQuery({ name: 'costCenterId', required: false, example: '3,8,9' })
  @ApiOkResponse({ description: 'Detalhamento controlado da linha recBruta' })
  getRecBrutaDetails(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetRecBrutaDetailsQueryDto,
  ) {
    return this.service.getRecBrutaDetails(dto);
  }

  @Get(':lineId/details')
  @Permissions('dre:consultar')
  @ApiQuery({ name: 'initialDate', required: true, example: '2026-03-01' })
  @ApiQuery({ name: 'finalDate', required: true, example: '2026-03-31' })
  @ApiQuery({ name: 'storeIds', required: false, example: '1,5' })
  @ApiQuery({ name: 'storeId', required: false, example: '1,5' })
  @ApiQuery({ name: 'costCenterIds', required: false, example: '3,8,9' })
  @ApiQuery({ name: 'costCenterId', required: false, example: '3,8,9' })
  @ApiOkResponse({ description: 'Detalhamento controlado de linha do Resultado Diario' })
  getLineDetails(
    @Param('lineId') lineId: string,
    @Query(new ValidationPipe({ transform: true }))
    dto: GetRecBrutaDetailsQueryDto,
  ) {
    return this.service.getLineDetails(lineId, dto);
  }
}
