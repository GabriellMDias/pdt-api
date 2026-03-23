import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsumoService } from 'src/adm/consumo/consumo.service';
import { MobileSyncPermanentError } from '../mobile-sync.errors';
import { MobileSyncEventProcessor, MobileSyncProcessorContext } from '../mobile-sync.types';

type ConsumptionItemPayload = {
  reasonId?: unknown;
  reasonDescription?: unknown;
  productId?: unknown;
  barcode?: unknown;
  productDescription?: unknown;
  movementType?: unknown;
  quantityInput?: unknown;
  packageCount?: unknown;
  totalQuantity?: unknown;
  signedQuantity?: unknown;
  capturedAt?: unknown;
};

@Injectable()
export class ConsumptionItemRecordedProcessor implements MobileSyncEventProcessor {
  constructor(private readonly consumoService: ConsumoService) {}

  canHandle(eventType: string): boolean {
    return eventType === 'consumption.item.recorded';
  }

  async process(context: MobileSyncProcessorContext): Promise<unknown> {
    const storeId = Number(context.event.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new MobileSyncPermanentError(
        'consumption_store_required',
        'Evento de consumo exige storeId valido no envelope.',
      );
    }

    const payload = (context.event.payload ?? {}) as ConsumptionItemPayload;
    const reasonId = Number(payload.reasonId);
    const productId = Number(payload.productId);
    const quantityInput = Number(payload.quantityInput);
    const packageCount = Number(payload.packageCount);
    const totalQuantity = Number(payload.totalQuantity);
    const signedQuantity = Number(payload.signedQuantity);

    if (!Number.isInteger(reasonId) || reasonId <= 0) {
      throw new MobileSyncPermanentError(
        'consumption_invalid_reason',
        'ReasonId e obrigatorio para registrar consumo.',
      );
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new MobileSyncPermanentError(
        'consumption_invalid_product',
        'ProductId e obrigatorio para registrar consumo.',
      );
    }

    if (!Number.isFinite(quantityInput) || quantityInput <= 0) {
      throw new MobileSyncPermanentError(
        'consumption_invalid_quantity_input',
        'Quantidade informada e obrigatoria para registrar consumo.',
      );
    }

    if (!Number.isFinite(packageCount) || packageCount <= 0) {
      throw new MobileSyncPermanentError(
        'consumption_invalid_package_count',
        'Embalagem informada e obrigatoria para registrar consumo.',
      );
    }

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      throw new MobileSyncPermanentError(
        'consumption_invalid_total_quantity',
        'Quantidade total invalida para registrar consumo.',
      );
    }

    if (!Number.isFinite(signedQuantity) || signedQuantity === 0) {
      throw new MobileSyncPermanentError(
        'consumption_invalid_signed_quantity',
        'Quantidade assinada invalida para registrar consumo.',
      );
    }

    try {
      const result = await this.consumoService.registerMobileEntry(
        {
          storeId,
          productId,
          reasonId,
          signedQuantity,
          totalQuantity,
          quantityInput,
          packageCount,
          userId: context.user.id,
        },
        context.client,
      );

      return {
        accepted: true,
        domain: 'consumption',
        storeId,
        productId,
        reasonId,
        signedQuantity: result.signedQuantity,
        productDescription:
          typeof payload.productDescription === 'string' ? payload.productDescription : result.description,
        reasonDescription:
          typeof payload.reasonDescription === 'string' ? payload.reasonDescription : null,
        barcode: typeof payload.barcode === 'string' ? payload.barcode : null,
        movementType: typeof payload.movementType === 'string' ? payload.movementType : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new MobileSyncPermanentError('consumption_dependency_not_found', error.message);
      }

      throw error;
    }
  }
}
