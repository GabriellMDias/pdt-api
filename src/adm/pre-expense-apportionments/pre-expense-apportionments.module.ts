import { Module } from '@nestjs/common';
import { PreExpenseApportionmentsService } from './pre-expense-apportionments.service';
import { PreExpenseApportionmentsController } from './pre-expense-apportionments.controller';
import { PrismaModule } from 'src/db/prisma/prisma.module';

@Module({
  controllers: [PreExpenseApportionmentsController],
  providers: [PreExpenseApportionmentsService],
  imports: [PrismaModule]
})
export class PreExpenseApportionmentsModule {}
