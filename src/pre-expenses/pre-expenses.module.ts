import { Module } from '@nestjs/common';
import { PreExpensesService } from './pre-expenses.service';
import { PreExpensesController } from './pre-expenses.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [PreExpensesController],
  providers: [PreExpensesService],
  imports: [PrismaModule]
})
export class PreExpensesModule {}
