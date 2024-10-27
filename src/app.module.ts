import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StoresModule } from './stores/stores.module';
import { ExpensesModule } from './expenses/expenses.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { DepartmentsModule } from './departments/departments.module';
import { MonthlyResultsModule } from './monthly-results/monthly-results.module';
import { ExpenseApportionmentsModule } from './expense-apportionments/expense-apportionments.module';
import { PreExpenseApportionmentsModule } from './pre-expense-apportionments/pre-expense-apportionments.module';
import { PreExpensesModule } from './pre-expenses/pre-expenses.module';

@Module({
  imports: [PrismaModule, StoresModule, ExpensesModule, UsersModule, AuthModule, CostCentersModule, DepartmentsModule, MonthlyResultsModule, ExpenseApportionmentsModule, PreExpenseApportionmentsModule, PreExpensesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
