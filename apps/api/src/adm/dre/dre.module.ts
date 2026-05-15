import { Module } from '@nestjs/common';
import { DreService } from './dre.service';
import { DreController } from './dre.controller';
import { PgModule } from 'src/db/pg/pg.module';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { ParametersModule } from 'src/config/parameters/parameters.module';
import { DreCostCenterSalesService } from './dre-cost-center-sales.service';
import { DailyResultConfigController } from './daily-result-config/daily-result-config.controller';
import { DailyResultConfigService } from './daily-result-config/daily-result-config.service';
import { MonthlyResultConsolidationsController } from './monthly-result-consolidations/monthly-result-consolidations.controller';
import { MonthlyResultConsolidationsService } from './monthly-result-consolidations/monthly-result-consolidations.service';
import { DailyResultEditValuesController } from './daily-result-edit-values/daily-result-edit-values.controller';
import { DailyResultEditValuesService } from './daily-result-edit-values/daily-result-edit-values.service';
import { DailyResultConsolidationController } from './daily-result-consolidation/daily-result-consolidation.controller';
import { DailyResultConsolidationService } from './daily-result-consolidation/daily-result-consolidation.service';
import { ResultLinesController } from './result-lines/result-lines.controller';
import { ResultLinesService } from './result-lines/result-lines.service';

@Module({
  controllers: [
    DailyResultConfigController,
    MonthlyResultConsolidationsController,
    DailyResultEditValuesController,
    DailyResultConsolidationController,
    ResultLinesController,
    DreController,
  ],
  providers: [
    DreService,
    DreCostCenterSalesService,
    DailyResultConfigService,
    MonthlyResultConsolidationsService,
    DailyResultEditValuesService,
    DailyResultConsolidationService,
    ResultLinesService,
  ],
  imports: [PgModule, PrismaModule, ParametersModule],
  exports: [DreCostCenterSalesService],
})
export class DreModule {}
