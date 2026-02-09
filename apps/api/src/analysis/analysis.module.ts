import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { PgModule } from 'src/db/pg/pg.module';

import { AnalysisController } from './analysis.controller';
import { SpedService } from './sped.service';
import { StockAnalysisService } from './stock-analysis.service';
import { AccountingReconcService } from './accounting-reconc.service';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [PrismaModule, PgModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, SpedService, StockAnalysisService, AccountingReconcService],
})
export class AnalysisModule {}
