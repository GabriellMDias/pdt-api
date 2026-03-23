import { BadRequestException, Injectable } from '@nestjs/common';
import { BalancoService } from 'src/adm/balanco/balanco.service';
import { ConsumoService } from 'src/adm/consumo/consumo.service';
import { ProducaoService } from 'src/adm/producao/producao.service';
import { TrocaService } from 'src/adm/troca/troca.service';
import { PullMobileSyncCatalogDto } from './dto/pull-mobile-sync-catalog.dto';
import { MobileSyncCatalogPullResponseEntity } from './entities/mobile-sync-catalog.entity';
import { AuthenticatedMobileUser } from './mobile-sync.types';

@Injectable()
export class MobileSyncCatalogService {
  constructor(
    private readonly trocaService: TrocaService,
    private readonly consumoService: ConsumoService,
    private readonly producaoService: ProducaoService,
    private readonly balancoService: BalancoService,
  ) {}

  async pullCatalog(
    _user: AuthenticatedMobileUser,
    dto: PullMobileSyncCatalogDto,
  ): Promise<MobileSyncCatalogPullResponseEntity> {
    switch (dto.domain) {
      case 'stock.products': {
        const items = await this.trocaService.listProductsForMobile(dto.storeId);
        return {
          domain: dto.domain,
          storeId: dto.storeId,
          syncedAt: new Date().toISOString(),
          cursor: null,
          items,
        };
      }
      case 'rupture.products': {
        const items = await this.trocaService.listProductsForMobile(dto.storeId);
        return {
          domain: dto.domain,
          storeId: dto.storeId,
          syncedAt: new Date().toISOString(),
          cursor: null,
          items,
        };
      }
      case 'exchange.reasons': {
        const items = await this.trocaService.listReasonsForMobile();
        return {
          domain: dto.domain,
          storeId: dto.storeId,
          syncedAt: new Date().toISOString(),
          cursor: null,
          items,
        };
      }
      case 'consumption.reasons': {
        const items = await this.consumoService.listReasonsForMobile();
        return {
          domain: dto.domain,
          storeId: dto.storeId,
          syncedAt: new Date().toISOString(),
          cursor: null,
          items,
        };
      }
      case 'production.recipes': {
        const items = await this.producaoService.listRecipesForMobile(dto.storeId);
        return {
          domain: dto.domain,
          storeId: dto.storeId,
          syncedAt: new Date().toISOString(),
          cursor: null,
          items,
        };
      }
      case 'balance.headers': {
        const items = await this.balancoService.listHeadersForMobile(dto.storeId);
        return {
          domain: dto.domain,
          storeId: dto.storeId,
          syncedAt: new Date().toISOString(),
          cursor: null,
          items,
        };
      }
      default:
        throw new BadRequestException(`Catalogo mobile nao suportado: ${dto.domain}.`);
    }
  }
}
