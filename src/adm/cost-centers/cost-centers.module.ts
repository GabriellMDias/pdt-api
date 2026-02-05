import { Module } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CostCentersController } from './cost-centers.controller';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { PgModule } from 'src/db/pg/pg.module';
import { SnkApiModule } from 'src/snk-api/snk-api.module';

@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService],
  imports: [PrismaModule, PgModule, SnkApiModule],
  exports: [CostCentersService]
})
export class CostCentersModule {}
