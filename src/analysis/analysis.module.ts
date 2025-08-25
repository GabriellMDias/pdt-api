import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PgModule } from 'src/pg/pg.module';

import { AnalysisController } from './analysis.controller';
import { SpedService } from './sped.service';
import { StockAnalysisService } from './stock-analysis.service';

@Module({
  imports: [PrismaModule, PgModule],
  controllers: [AnalysisController],
  providers: [SpedService, StockAnalysisService],
})
export class AnalysisModule {}
