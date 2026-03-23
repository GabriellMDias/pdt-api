import { Injectable, NotFoundException } from '@nestjs/common';
import { RupturaService } from 'src/adm/ruptura/ruptura.service';
import { MobileSyncPermanentError } from '../mobile-sync.errors';
import { MobileSyncEventProcessor, MobileSyncProcessorContext } from '../mobile-sync.types';

type RuptureItemPayload = {
  shelfCode?: unknown;
  productId?: unknown;
  barcode?: unknown;
  productDescription?: unknown;
  capturedAt?: unknown;
};

@Injectable()
export class RuptureItemReportedProcessor implements MobileSyncEventProcessor {
  constructor(private readonly rupturaService: RupturaService) {}

  canHandle(eventType: string): boolean {
    return eventType === 'rupture.item.reported';
  }

  async process(context: MobileSyncProcessorContext): Promise<unknown> {
    const storeId = Number(context.event.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new MobileSyncPermanentError(
        'rupture_store_required',
        'Evento de ruptura exige storeId valido no envelope.',
      );
    }

    const payload = (context.event.payload ?? {}) as RuptureItemPayload;
    const shelfCode = typeof payload.shelfCode === 'string' ? payload.shelfCode.trim() : '';
    const productId = Number(payload.productId);

    if (!shelfCode) {
      throw new MobileSyncPermanentError(
        'rupture_invalid_shelf',
        'ShelfCode e obrigatorio para registrar ruptura.',
      );
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new MobileSyncPermanentError(
        'rupture_invalid_product',
        'ProductId e obrigatorio para registrar ruptura.',
      );
    }

    try {
      const product = await this.rupturaService.registerCollectorItem(
        {
          storeId,
          productId,
          shelfCode,
        },
        context.client,
      );

      return {
        accepted: true,
        domain: 'rupture',
        storeId,
        productId,
        shelfCode,
        productDescription:
          typeof payload.productDescription === 'string' ? payload.productDescription : null,
        barcode: typeof payload.barcode === 'string' ? payload.barcode : null,
        resolvedDescription: product.description,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new MobileSyncPermanentError(
          'rupture_product_not_found',
          error.message,
        );
      }

      throw error;
    }
  }
}
