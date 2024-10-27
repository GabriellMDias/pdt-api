import { Module } from '@nestjs/common';
import { ExpenseApportionmentsService } from './expense-apportionments.service';
import { ExpenseApportionmentsController } from './expense-apportionments.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ExpenseApportionmentsController],
  providers: [ExpenseApportionmentsService],
  imports: [PrismaModule]
})
export class ExpenseApportionmentsModule {}
