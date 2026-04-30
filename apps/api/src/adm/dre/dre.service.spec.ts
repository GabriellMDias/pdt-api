import { Test, TestingModule } from '@nestjs/testing';
import { DreService } from './dre.service';
import { PgService } from 'src/db/pg/pg.service';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ParametersService } from 'src/config/parameters/parameters.service';
import { DreCostCenterSalesService } from './dre-cost-center-sales.service';

describe('DreService', () => {
  let service: DreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DreService,
        { provide: PgService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: ParametersService, useValue: {} },
        { provide: DreCostCenterSalesService, useValue: { getCostCenterSales: jest.fn() } },
      ],
    }).compile();

    service = module.get<DreService>(DreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
