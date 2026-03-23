import { Injectable } from '@nestjs/common';
import { BalanceItemRecordedProcessor } from './processors/balance-item-recorded.processor';
import { ConsumptionItemRecordedProcessor } from './processors/consumption-item-recorded.processor';
import { NoopMobileSyncProcessor } from './processors/noop-mobile-sync.processor';
import { ExchangeItemRecordedProcessor } from './processors/exchange-item-recorded.processor';
import { ProductionItemRecordedProcessor } from './processors/production-item-recorded.processor';
import { RuptureItemReportedProcessor } from './processors/rupture-item-reported.processor';
import { MobileSyncEventProcessor } from './mobile-sync.types';

@Injectable()
export class MobileSyncProcessorRegistry {
  private readonly processors: MobileSyncEventProcessor[];

  constructor(
    noopProcessor: NoopMobileSyncProcessor,
    ruptureItemReportedProcessor: RuptureItemReportedProcessor,
    exchangeItemRecordedProcessor: ExchangeItemRecordedProcessor,
    consumptionItemRecordedProcessor: ConsumptionItemRecordedProcessor,
    productionItemRecordedProcessor: ProductionItemRecordedProcessor,
    balanceItemRecordedProcessor: BalanceItemRecordedProcessor,
  ) {
    this.processors = [
      noopProcessor,
      ruptureItemReportedProcessor,
      exchangeItemRecordedProcessor,
      consumptionItemRecordedProcessor,
      productionItemRecordedProcessor,
      balanceItemRecordedProcessor,
    ];
  }

  resolve(eventType: string): MobileSyncEventProcessor | null {
    return this.processors.find((processor) => processor.canHandle(eventType)) ?? null;
  }
}
