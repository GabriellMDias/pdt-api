import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { StoresModule } from './stores/stores.module';
import { ExpensesModule } from './expenses/expenses.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { DepartmentsModule } from './departments/departments.module';
import { ExpenseApportionmentsModule } from './expense-apportionments/expense-apportionments.module';
import { PreExpenseApportionmentsModule } from './pre-expense-apportionments/pre-expense-apportionments.module';
import { PreExpensesModule } from './pre-expenses/pre-expenses.module';
import { PgModule } from './pg/pg.module';
import { DreModule } from './dre/dre.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AnalysisModule } from './analysis/analysis.module';
import { DbScriptsModule } from './db-scripts/db-scripts.module'; 
import { ParametersModule } from './parameters/parameters.module';
import { SnkApiModule } from './snk-api/snk-api.module';
import { CodeJobsModule } from './code-jobs/code-jobs.module';
import { CostCenterComparativeModule } from './cost-center-comparative/cost-center-comparative.module';

@Module({
  imports: [ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..',  'front', 'dist'),
    }),
    ScheduleModule.forRoot(),
    PrismaModule, StoresModule, ExpensesModule, UsersModule, AuthModule, CostCentersModule, DepartmentsModule, ExpenseApportionmentsModule, PreExpenseApportionmentsModule, PreExpensesModule, PgModule, DreModule, PermissionsModule, AnalysisModule, DbScriptsModule, ParametersModule, SnkApiModule, CodeJobsModule, CostCenterComparativeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
