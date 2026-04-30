import { Module } from '@nestjs/common';
import { DreService } from './dre.service';
import { DreController } from './dre.controller';
import { PgModule } from 'src/db/pg/pg.module';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { ParametersModule } from 'src/config/parameters/parameters.module';
import { DreCostCenterSalesService } from './dre-cost-center-sales.service';

@Module({
  controllers: [DreController],
  providers: [DreService, DreCostCenterSalesService],
  imports: [PgModule, PrismaModule, ParametersModule],
  exports: [DreCostCenterSalesService],
})
export class DreModule {}
