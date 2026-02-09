import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CodeJobsService } from './code-jobs.service';
import { CodeJobsController } from './code-jobs.controller';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { PgService } from 'src/db/pg/pg.service';
import { SnkApiModule } from 'src/snk-api/snk-api.module';
import { ParametersModule } from 'src/config/parameters/parameters.module';
import { StoresModule } from 'src/config/stores/stores.module';
import { CostCentersModule } from 'src/adm/cost-centers/cost-centers.module';
import { DepartmentsModule } from 'src/adm/departments/departments.module';

@Module({
  imports: [ScheduleModule.forRoot(), SnkApiModule, ParametersModule, StoresModule, CostCentersModule, DepartmentsModule],
  providers: [CodeJobsService, PrismaService, PgService],
  controllers: [CodeJobsController],
  exports: [CodeJobsService],
})
export class CodeJobsModule {}
