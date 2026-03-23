import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BalancoService } from '../adm/balanco/balanco.service';
import { ConsumoService } from '../adm/consumo/consumo.service';
import { ProducaoService } from '../adm/producao/producao.service';
import { TrocaService } from '../adm/troca/troca.service';
import { MobileSyncCatalogService } from './mobile-sync.catalog.service';

describe('MobileSyncCatalogService', () => {
  let service: MobileSyncCatalogService;

  const trocaServiceMock = {
    listProductsForMobile: jest.fn(),
    listReasonsForMobile: jest.fn(),
  };
  const consumoServiceMock = {
    listReasonsForMobile: jest.fn(),
  };
  const balancoServiceMock = {
    listHeadersForMobile: jest.fn(),
  };
  const producaoServiceMock = {
    listRecipesForMobile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileSyncCatalogService,
        { provide: TrocaService, useValue: trocaServiceMock },
        { provide: ConsumoService, useValue: consumoServiceMock },
        { provide: BalancoService, useValue: balancoServiceMock },
        { provide: ProducaoService, useValue: producaoServiceMock },
      ],
    }).compile();

    service = module.get<MobileSyncCatalogService>(MobileSyncCatalogService);
  });

  it('deve retornar o catalogo de produtos de ruptura', async () => {
    trocaServiceMock.listProductsForMobile.mockResolvedValue([
      {
        id: 10,
        barcode: '789',
        description: 'Produto Teste',
        packageQuantity: 1,
        packagingTypeId: 2,
        packagingDescription: 'UN',
        shelfCode: '12',
        activeStatus: true,
        decimalAllowed: false,
        salePrice: 10.9,
        stockQuantity: 14,
        exchangeQuantity: 2,
        averageCostWithTax: 7.5,
        grossWeight: 1.1,
      },
    ]);

    const response = await service.pullCatalog(
      { id: 1, email: 'user@test.com', permissions: [] },
      { domain: 'rupture.products', storeId: 5 },
    );

    expect(trocaServiceMock.listProductsForMobile).toHaveBeenCalledWith(5);
    expect(response.domain).toBe('rupture.products');
    expect(response.storeId).toBe(5);
    expect(response.items).toHaveLength(1);
  });

  it('deve retornar o catalogo de motivos de troca', async () => {
    trocaServiceMock.listReasonsForMobile.mockResolvedValue([
      {
        id: 1,
        description: 'Avaria',
        activeStatus: true,
      },
    ]);

    const response = await service.pullCatalog(
      { id: 1, email: 'user@test.com', permissions: [] },
      { domain: 'exchange.reasons', storeId: 5 },
    );

    expect(trocaServiceMock.listReasonsForMobile).toHaveBeenCalledTimes(1);
    expect(response.domain).toBe('exchange.reasons');
    expect(response.items).toHaveLength(1);
  });

  it('deve retornar o catalogo de tipos de consumo', async () => {
    consumoServiceMock.listReasonsForMobile.mockResolvedValue([
      {
        id: 8,
        description: 'Consumo Interno',
        activeStatus: true,
      },
    ]);

    const response = await service.pullCatalog(
      { id: 1, email: 'user@test.com', permissions: [] },
      { domain: 'consumption.reasons', storeId: 5 },
    );

    expect(consumoServiceMock.listReasonsForMobile).toHaveBeenCalledTimes(1);
    expect(response.domain).toBe('consumption.reasons');
    expect(response.items).toHaveLength(1);
  });

  it('deve rejeitar dominio nao suportado', async () => {
    await expect(
      service.pullCatalog(
        { id: 1, email: 'user@test.com', permissions: [] },
        { domain: 'unsupported.domain' as never, storeId: 5 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve retornar o catalogo de receitas de producao', async () => {
    producaoServiceMock.listRecipesForMobile.mockResolvedValue([
      {
        id: 3,
        description: 'Pao Frances',
        activeStatus: true,
        outputs: [
          {
            recipeOutputId: 31,
            productId: 401,
            yieldQuantity: 1,
          },
          {
            recipeOutputId: 32,
            productId: 402,
            yieldQuantity: 1,
          },
        ],
        inputs: [
          {
            recipeInputId: 901,
            productId: 101,
            recipePackageQuantity: 1,
            productPackageQuantity: 1,
            deductStock: true,
            conversionFactor: 1,
          },
        ],
      },
    ]);

    const response = await service.pullCatalog(
      { id: 1, email: 'user@test.com', permissions: [] },
      { domain: 'production.recipes', storeId: 5 },
    );

    expect(producaoServiceMock.listRecipesForMobile).toHaveBeenCalledWith(5);
    expect(response.domain).toBe('production.recipes');
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      id: 3,
      outputs: expect.arrayContaining([
        expect.objectContaining({ productId: 401 }),
        expect.objectContaining({ productId: 402 }),
      ]),
      inputs: expect.arrayContaining([
        expect.objectContaining({ productId: 101, deductStock: true }),
      ]),
    });
  });

  it('deve retornar o catalogo de balancos', async () => {
    balancoServiceMock.listHeadersForMobile.mockResolvedValue([
      {
        id: 77,
        description: 'Balanco Rotativo',
        stockLabel: 'Loja',
        statusCode: 0,
      },
    ]);

    const response = await service.pullCatalog(
      { id: 1, email: 'user@test.com', permissions: [] },
      { domain: 'balance.headers', storeId: 5 },
    );

    expect(balancoServiceMock.listHeadersForMobile).toHaveBeenCalledWith(5);
    expect(response.domain).toBe('balance.headers');
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      id: 77,
      stockLabel: 'Loja',
      statusCode: 0,
    });
  });
});
