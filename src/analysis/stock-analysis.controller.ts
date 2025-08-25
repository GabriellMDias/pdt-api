// src/stock/analysis/stock-analysis.controller.ts
import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StockAnalysisService } from './stock-analysis.service';
import { DiferencaDiarioQueryDto } from './dto/diferenca-diario.query.dto';
import { DiferencaNoDiaQueryDto } from './dto/diferenca-no-dia.query.dto';
import { DiferencaDiarioEntity } from './entities/diferenca-diario.entity';
import { DiferencaNoDiaEntity } from './entities/diferenca-no-dia.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Stock Analysis')
@Controller('stock-analysis')
export class StockAnalysisController {
  constructor(private readonly service: StockAnalysisService) {}

  /**
   * GET /stock-analysis/mes?lojas=5,7&dataInicial=2025-07-29&dataFinal=2025-07-31
   */
  @Get('mes')
  @Permissions("stock-analysis:consultar")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [DiferencaDiarioEntity] })
  async diferencaProducaoTransformadoDiario(@Query() q: DiferencaDiarioQueryDto): Promise<DiferencaDiarioEntity[]> {
    return this.service.diferencaProducaoTransformadoDiario(q.lojas, q.dataInicial, q.dataFinal);
  }

  /**
   * GET /stock-analysis/dia?lojas=5,7&data=2025-07-29
   */
  @Get('dia')
  @Permissions("stock-analysis:consultar")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [DiferencaNoDiaEntity] })
  async diferencaProducaoTransformadoNoDia(@Query() q: DiferencaNoDiaQueryDto): Promise<DiferencaNoDiaEntity[]> {
    return this.service.diferencaProducaoTransformadoNoDia(q.lojas, q.data);
  }
}
