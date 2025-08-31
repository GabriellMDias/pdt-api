import { Controller, Get, Post, Query, Param, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
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
import { ArquivoAnaliseEntity } from './entities/arquivo-analise.entity';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { ArquivoAnaliseQueryDto } from './dto/arquivo-analise.query.dto';

@ApiTags('Analysis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly stockService: StockAnalysisService,
    private readonly spedService: SpedService,
  ) {}

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
}
