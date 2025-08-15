import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { PgModule } from './pg/pg.module';
import { DreModule } from './dre/dre.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SpedModule } from './sped/sped.module';

@Module({
  imports: [ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..',  'front', 'dist'),
    }),
    PrismaModule, StoresModule, ExpensesModule, UsersModule, AuthModule, CostCentersModule, DepartmentsModule, MonthlyResultsModule, ExpenseApportionmentsModule, PreExpenseApportionmentsModule, PreExpensesModule, PgModule, DreModule, PermissionsModule, SpedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
