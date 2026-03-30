import { Injectable, NotFoundException } from '@nestjs/common';
import { ProducaoService } from 'src/adm/producao/producao.service';
import { MobileSyncPermanentError } from '../mobile-sync.errors';
import { MobileSyncEventProcessor, MobileSyncProcessorContext } from '../mobile-sync.types';

type ProductionItemPayload = {
  recipeId?: unknown;
  recipeDescription?: unknown;
  productId?: unknown;
  productDescription?: unknown;
  quantityInput?: unknown;
  capturedAt?: unknown;
};

@Injectable()
export class ProductionItemRecordedProcessor implements MobileSyncEventProcessor {
  constructor(private readonly producaoService: ProducaoService) {}

  canHandle(eventType: string): boolean {
    return eventType === 'production.item.recorded';
  }

  async process(context: MobileSyncProcessorContext): Promise<unknown> {
    const storeId = Number(context.event.storeId);
    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new MobileSyncPermanentError(
        'production_store_required',
        'Evento de producao exige storeId valido no envelope.',
      );
    }

    const payload = (context.event.payload ?? {}) as ProductionItemPayload;
    const recipeId = Number(payload.recipeId);
    const productId = Number(payload.productId);
    const quantityInput = Number(payload.quantityInput);

    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      throw new MobileSyncPermanentError(
        'production_invalid_recipe',
        'RecipeId e obrigatorio para registrar producao.',
      );
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new MobileSyncPermanentError(
        'production_invalid_product',
        'ProductId e obrigatorio para registrar producao.',
      );
    }

    if (!Number.isFinite(quantityInput) || quantityInput <= 0) {
      throw new MobileSyncPermanentError(
        'production_invalid_quantity',
        'Quantidade informada e obrigatoria para registrar producao.',
      );
    }

    try {
      const result = await this.producaoService.registerMobileEntry(
        {
          storeId,
          recipeId,
          productId,
          quantityInput,
          codigoUsuarioVrMaster: context.user.codigoUsuarioVrMaster,
        },
        context.client,
      );

      return {
        accepted: true,
        domain: 'production',
        storeId,
        recipeId,
        productId,
        quantityInput: result.quantityInput,
        recipeDescription:
          typeof payload.recipeDescription === 'string' ? payload.recipeDescription : null,
        productDescription:
          typeof payload.productDescription === 'string' ? payload.productDescription : result.description,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new MobileSyncPermanentError('production_dependency_not_found', error.message);
      }

      throw error;
    }
  }
}
