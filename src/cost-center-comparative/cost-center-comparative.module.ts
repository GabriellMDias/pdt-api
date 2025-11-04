import { Module } from '@nestjs/common';
import { CostCenterComparativeService } from './cost-center-comparative.service';
import { CostCenterComparativeController } from './cost-center-comparative.controller';
import { PgModule } from 'src/pg/pg.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PgModule, PermissionsModule, PrismaModule],
  providers: [CostCenterComparativeService],
  controllers: [CostCenterComparativeController]
})
export class CostCenterComparativeModule {}
