import { Test, TestingModule } from '@nestjs/testing';
import { CostCenterComparativeService } from './cost-center-comparative.service';

describe('CostCenterComparativeService', () => {
  let service: CostCenterComparativeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostCenterComparativeService],
    }).compile();

    service = module.get<CostCenterComparativeService>(CostCenterComparativeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
