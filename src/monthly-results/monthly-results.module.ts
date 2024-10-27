import { Module } from '@nestjs/common';
import { MonthlyResultsService } from './monthly-results.service';
import { MonthlyResultsController } from './monthly-results.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [MonthlyResultsController],
  providers: [MonthlyResultsService],
  imports: [PrismaModule]
})
export class MonthlyResultsModule {}
