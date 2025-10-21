import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CodeJobsService } from './code-jobs.service';
import { CodeJobsController } from './code-jobs.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PgService } from 'src/pg/pg.service';
import { SnkApiModule } from 'src/snk-api/snk-api.module';
import { ParametersModule } from 'src/parameters/parameters.module';

@Module({
  imports: [ScheduleModule.forRoot(), SnkApiModule, ParametersModule],
  providers: [CodeJobsService, PrismaService, PgService],
  controllers: [CodeJobsController],
  exports: [CodeJobsService],
})
export class CodeJobsModule {}
