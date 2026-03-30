import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BalancoService } from 'src/adm/balanco/balanco.service';
import { MobileSyncPermanentError } from '../mobile-sync.errors';
import { MobileSyncEventProcessor, MobileSyncProcessorContext } from '../mobile-sync.types';

type BalanceItemPayload = {
  balanceId?: unknown;
  balanceDescription?: unknown;
  stockLabel?: unknown;
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
export class BalanceItemRecordedProcessor implements MobileSyncEventProcessor {
  constructor(private readonly balancoService: BalancoService) {}

  canHandle(eventType: string): boolean {
    return eventType === 'balance.item.recorded';
  }

  async process(context: MobileSyncProcessorContext): Promise<unknown> {
    const storeId = Number(context.event.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new MobileSyncPermanentError(
        'balance_store_required',
        'Evento de balanco exige storeId valido no envelope.',
      );
    }

    const payload = (context.event.payload ?? {}) as BalanceItemPayload;
    const balanceId = Number(payload.balanceId);
    const productId = Number(payload.productId);
    const quantityInput = Number(payload.quantityInput);
    const packageCount = Number(payload.packageCount);
    const totalQuantity = Number(payload.totalQuantity);
    const signedQuantity = Number(payload.signedQuantity);

    if (!Number.isInteger(balanceId) || balanceId <= 0) {
      throw new MobileSyncPermanentError(
        'balance_invalid_balance',
        'BalanceId e obrigatorio para registrar balanco.',
      );
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new MobileSyncPermanentError(
        'balance_invalid_product',
        'ProductId e obrigatorio para registrar balanco.',
      );
    }

    if (!Number.isFinite(quantityInput) || quantityInput <= 0) {
      throw new MobileSyncPermanentError(
        'balance_invalid_quantity_input',
        'Quantidade informada e obrigatoria para registrar balanco.',
      );
    }

    if (!Number.isFinite(packageCount) || packageCount <= 0) {
      throw new MobileSyncPermanentError(
        'balance_invalid_package_count',
        'Embalagem informada e obrigatoria para registrar balanco.',
      );
    }

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      throw new MobileSyncPermanentError(
        'balance_invalid_total_quantity',
        'Quantidade total invalida para registrar balanco.',
      );
    }

    if (!Number.isFinite(signedQuantity) || signedQuantity === 0) {
      throw new MobileSyncPermanentError(
        'balance_invalid_signed_quantity',
        'Quantidade assinada invalida para registrar balanco.',
      );
    }

    try {
      const result = await this.balancoService.registerMobileEntry(
        {
          storeId,
          balanceId,
          productId,
          signedQuantity,
          totalQuantity,
          quantityInput,
          packageCount,
          codigoUsuarioVrMaster: context.user.codigoUsuarioVrMaster,
        },
        context.client,
      );

      return {
        accepted: true,
        domain: 'balance',
        storeId,
        balanceId,
        productId,
        signedQuantity: result.signedQuantity,
        balanceDescription:
          typeof payload.balanceDescription === 'string' ? payload.balanceDescription : null,
        stockLabel: typeof payload.stockLabel === 'string' ? payload.stockLabel : null,
        productDescription:
          typeof payload.productDescription === 'string' ? payload.productDescription : result.description,
        barcode: typeof payload.barcode === 'string' ? payload.barcode : null,
        movementType: typeof payload.movementType === 'string' ? payload.movementType : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw new MobileSyncPermanentError('balance_dependency_not_found', error.message);
      }

      throw error;
    }
  }
}
