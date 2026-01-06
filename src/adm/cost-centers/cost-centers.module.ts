import { Module } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CostCentersController } from './cost-centers.controller';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { PgModule } from 'src/db/pg/pg.module';

@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService],
  imports: [PrismaModule, PgModule],
  exports: [CostCentersService]
})
export class CostCentersModule {}
