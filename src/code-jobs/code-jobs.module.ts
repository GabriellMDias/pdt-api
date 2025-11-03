import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CodeJobsService } from './code-jobs.service';
import { CodeJobsController } from './code-jobs.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PgService } from 'src/pg/pg.service';
import { SnkApiModule } from 'src/snk-api/snk-api.module';
import { ParametersModule } from 'src/parameters/parameters.module';
import { StoresModule } from 'src/stores/stores.module';
import { CostCentersModule } from 'src/cost-centers/cost-centers.module';
import { DepartmentsModule } from 'src/departments/departments.module';

@Module({
  imports: [ScheduleModule.forRoot(), SnkApiModule, ParametersModule, StoresModule, CostCentersModule, DepartmentsModule],
  providers: [CodeJobsService, PrismaService, PgService],
  controllers: [CodeJobsController],
  exports: [CodeJobsService],
})
export class CodeJobsModule {}
