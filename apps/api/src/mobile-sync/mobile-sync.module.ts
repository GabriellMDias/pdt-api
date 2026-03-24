import { Module } from '@nestjs/common';
import { BalancoModule } from 'src/adm/balanco/balanco.module';
import { ConsumoModule } from 'src/adm/consumo/consumo.module';
import { ProducaoModule } from 'src/adm/producao/producao.module';
import { RupturaModule } from 'src/adm/ruptura/ruptura.module';
import { TrocaModule } from 'src/adm/troca/troca.module';
import { PgModule } from 'src/db/pg/pg.module';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { MobileSyncAdminController } from './mobile-sync-admin.controller';
import { MobileSyncController } from './mobile-sync.controller';
import { MobileSyncCatalogService } from './mobile-sync.catalog.service';
import { MobileSyncLogsService } from './mobile-sync-logs.service';
import { MobileSyncService } from './mobile-sync.service';
import { MobileSyncReceiptsRepository } from './mobile-sync.receipts.repository';
import { MobileSyncProcessorRegistry } from './mobile-sync.processor.registry';
import { ConsumptionItemRecordedProcessor } from './processors/consumption-item-recorded.processor';
import { BalanceItemRecordedProcessor } from './processors/balance-item-recorded.processor';
import { ExchangeItemRecordedProcessor } from './processors/exchange-item-recorded.processor';
import { NoopMobileSyncProcessor } from './processors/noop-mobile-sync.processor';
import { ProductionItemRecordedProcessor } from './processors/production-item-recorded.processor';
import { RuptureItemReportedProcessor } from './processors/rupture-item-reported.processor';

@Module({
  imports: [PgModule, PrismaModule, RupturaModule, TrocaModule, ConsumoModule, ProducaoModule, BalancoModule],
  controllers: [MobileSyncController, MobileSyncAdminController],
  providers: [
    MobileSyncCatalogService,
    MobileSyncLogsService,
    MobileSyncService,
    MobileSyncReceiptsRepository,
    MobileSyncProcessorRegistry,
    NoopMobileSyncProcessor,
    RuptureItemReportedProcessor,
    ExchangeItemRecordedProcessor,
    ConsumptionItemRecordedProcessor,
    ProductionItemRecordedProcessor,
    BalanceItemRecordedProcessor,
  ],
  exports: [MobileSyncService],
})
export class MobileSyncModule {}
