import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { PrismaModule } from './db/prisma/prisma.module';
import { StoresModule } from './config/stores/stores.module';
import { ExpensesModule } from './adm/expenses/expenses.module';
import { UsersModule } from './config/users/users.module';
import { AuthModule } from './auth/auth.module';
import { CostCentersModule } from './adm/cost-centers/cost-centers.module';
import { DepartmentsModule } from './adm/departments/departments.module';
import { PgModule } from './db/pg/pg.module';
import { DreModule } from './adm/dre/dre.module';
import { PermissionsModule } from './config/permissions/permissions.module';
import { AnalysisModule } from './analysis/analysis.module';
import { DbScriptsModule } from './config/db-scripts/db-scripts.module'; 
import { ParametersModule } from './config/parameters/parameters.module';
import { SnkApiModule } from './snk-api/snk-api.module';
import { CodeJobsModule } from './config/code-jobs/code-jobs.module';
import { CostCenterComparativeModule } from './adm/cost-center-comparative/cost-center-comparative.module';
import { TopModule } from './fiscal/top/top.module';
import { ConsumoModule } from './adm/consumo/consumo.module';
import { BalancoModule } from './adm/balanco/balanco.module';
import { ProducaoModule } from './adm/producao/producao.module';
import { RupturaModule } from './adm/ruptura/ruptura.module';
import { TrocaModule } from './adm/troca/troca.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VendaDiaDModule } from './adm/venda-dia-d/venda-dia-d.module';
import { MobileSyncModule } from './mobile-sync/mobile-sync.module';
import { MobileUpdatesModule } from './mobile-updates/mobile-updates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '..', '..', '.env'),
        join(__dirname, '..', '.env'),
        '.env',
      ],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StoresModule,
    ExpensesModule,
    UsersModule,
    AuthModule,
    CostCentersModule,
    DepartmentsModule,
    PgModule,
    DreModule,
    PermissionsModule,
    AnalysisModule,
    DbScriptsModule,
    ParametersModule,
    SnkApiModule,
    CodeJobsModule,
    CostCenterComparativeModule,
    TopModule,
    BalancoModule,
    ConsumoModule,
    ProducaoModule,
    RupturaModule,
    TrocaModule,
    VendaDiaDModule,
    NotificationsModule,
    MobileSyncModule,
    MobileUpdatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
