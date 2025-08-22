// src/stock/analysis/stock-analysis.module.ts
import { Module } from '@nestjs/common';
import { StockAnalysisController } from './stock-analysis.controller';
import { StockAnalysisService } from './stock-analysis.service';
import { PgModule } from 'src/pg/pg.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PgModule, PrismaModule],
  controllers: [StockAnalysisController],
  providers: [StockAnalysisService],
})
export class StockAnalysisModule {}
