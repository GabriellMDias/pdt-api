import { Injectable } from '@nestjs/common';
import { MobileSyncEventProcessor, MobileSyncProcessorContext } from '../mobile-sync.types';

@Injectable()
export class NoopMobileSyncProcessor implements MobileSyncEventProcessor {
  canHandle(eventType: string): boolean {
    return eventType === 'mobile.noop';
  }

  async process(context: MobileSyncProcessorContext): Promise<unknown> {
    return {
      accepted: true,
      eventType: context.event.eventType,
      receiptId: context.receiptId,
    };
  }
}
