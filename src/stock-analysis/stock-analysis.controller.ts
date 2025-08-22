import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StockAnalysisService } from './stock-analysis.service';
import { ResumoMesQueryDto } from './dto/resumo-mes.query.dto';
import { ResumoDiaQueryDto } from './dto/resumo-dia.query.dto';
import { ResumoMesEntity } from './entities/resumo-mes.entity';
import { ResumoDiaEntity } from './entities/resumo-dia.entity';
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
  @ApiOkResponse({ type: [ResumoMesEntity] })
  async resumoMes(@Query() q: ResumoMesQueryDto): Promise<ResumoMesEntity[]> {
    return this.service.resumoMes(q.lojas, q.dataInicial, q.dataFinal);
  }

  /**
   * GET /stock-analysis/dia?lojas=5,7&data=2025-07-29
   */
  @Get('dia')
  @Permissions("stock-analysis:consultar")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [ResumoDiaEntity] })
  async resumoDia(@Query() q: ResumoDiaQueryDto): Promise<ResumoDiaEntity[]> {
    return this.service.resumoDia(q.lojas, q.data);
  }
}
