import { Controller, Get, Post, Query, Param, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StockAnalysisService } from './stock-analysis.service';
import { SpedService } from './sped.service';
import { DiferencaDiarioQueryDto } from './dto/diferenca-diario.query.dto';
import { DiferencaNoDiaQueryDto } from './dto/diferenca-no-dia.query.dto';
import { DiferencaDiarioEntity } from './entities/diferenca-diario.entity';
import { DiferencaNoDiaEntity } from './entities/diferenca-no-dia.entity';
import { DiferencaCustoMedioxUltimoDiarioEntity } from './entities/diferenca-custo-medioxultimo-diario.entity';
import { DiferencaCustoMedioxUltimoNoDiaEntity } from './entities/diferenca-custo-medioxultimo-no-dia.entity';
import { ArquivoAnaliseEntity } from './entities/arquivo-analise.entity';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { ArquivoAnaliseQueryDto } from './dto/arquivo-analise.query.dto';
import { AccountingReconcService } from './accounting-reconc.service';
import { AccountingReconcQueryDto } from './dto/accounting-reconc.query.dto';
import { AnalysisService } from './analysis.service';
import { AnalysisTypeQueryDto } from './dto/analysis-type.query.dto';

@ApiTags('Analysis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly stockService: StockAnalysisService,
    private readonly spedService: SpedService,
    private readonly accountingReconcService: AccountingReconcService,
    private readonly analysisService: AnalysisService,
  ) {}

  @Get('types')
  @ApiOkResponse({ type: Object, isArray: true })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findTypes(@Query() q: AnalysisTypeQueryDto) {
    return this.analysisService.findTypes(q);
  }


  @Get('stock/diferenca-producao-transformado/diario')
  @Permissions('stock-analysis:consultar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [DiferencaDiarioEntity] })
  async stockDiario(@Query() q: DiferencaDiarioQueryDto): Promise<DiferencaDiarioEntity[]> {
    return this.stockService.diferencaProducaoTransformadoDiario(q.storeIds, q.initialDate, q.finalDate);
  }

  @Get('stock/diferenca-producao-transformado/no-dia')
  @Permissions('stock-analysis:consultar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [DiferencaNoDiaEntity] })
  async stockNoDia(@Query() q: DiferencaNoDiaQueryDto): Promise<DiferencaNoDiaEntity[]> {
    return this.stockService.diferencaProducaoTransformadoNoDia(q.storeIds, q.date);
  }

  @Get('stock/diferenca-custo-medioxultimo/diario')
  @Permissions('stock-analysis:consultar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [DiferencaCustoMedioxUltimoDiarioEntity] })
  async stockCustoMedioUltimoDiario(
    @Query() q: DiferencaDiarioQueryDto,
  ): Promise<DiferencaCustoMedioxUltimoDiarioEntity[]> {
    return this.stockService.diferencaCustoMedioxUltimoDiario(q.storeIds, q.initialDate, q.finalDate);
  }

  @Get('stock/diferenca-custo-medioxultimo/no-dia')
  @Permissions('stock-analysis:consultar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ type: [DiferencaCustoMedioxUltimoNoDiaEntity] })
  async stockCustoMedioUltimoNoDia(
    @Query() q: DiferencaNoDiaQueryDto,
  ): Promise<DiferencaCustoMedioxUltimoNoDiaEntity[]> {
    return this.stockService.diferencaCustoMedioxUltimoNoDia(q.storeIds, q.date);
  }

  @Post('sped/upload')
  @Permissions('sped:upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
  }))
  
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })

  async uploadSped(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const userId = req.user?.id ?? 0;
    return this.spedService.processarArquivo(file.path, file.filename, userId);
  }

  @Get('sped/arquivo')
  @Permissions('sped:consultarRelatorioSPED')
  @ApiOkResponse({ type: ArquivoAnaliseEntity, isArray: true })
  async listArquivos(@Query() q: ArquivoAnaliseQueryDto) {
    const lojas = q.storeIds
      ? q.storeIds.split(',').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n))
      : undefined;

    return this.spedService.getArquivoAnalise({
      lojas,
      dataInicial: q.initialDate,
      dataFinal: q.finalDate,
      page: q.page,
      pageSize: q.pageSize,
    });
  }

  @Get('sped/by-file/:arquivoAnaliseId')
  @Permissions('sped:consultarRelatorioSPED')
  @ApiOkResponse({ type: Object, isArray: true })
  async spedByFile(@Param('arquivoAnaliseId', ParseIntPipe) arquivoAnaliseId: number) {
    return this.spedService.getSpedAnalise(arquivoAnaliseId);
  }

  @Get('accountingReconc')
  @Permissions('accounting-reconc:consultar')
  @ApiOkResponse({ type: Object, isArray: true })
  @ApiQuery({ name: 'storeIds', required: true, type: Number, isArray: true, style: 'form', explode: true, example: [1, 5] })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2025-11-30' })
  @ApiQuery({ name: 'analysisCode', required: true, type: String, example: 'conc_contab_aplicacao' })
  @ApiQuery({ name: 'divergente', required: false, type: Boolean })
  async accountingReconc(@Query() q: AccountingReconcQueryDto) {
    const { storeIds, date, analysisCode, divergente } = q;

    return this.accountingReconcService.aplicar(storeIds, date, analysisCode, divergente ?? false);
  }
}
