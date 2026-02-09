import { Test, TestingModule } from '@nestjs/testing';
import { CostCenterComparativeController } from './cost-center-comparative.controller';

describe('CostCenterComparativeController', () => {
  let controller: CostCenterComparativeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostCenterComparativeController],
    }).compile();

    controller = module.get<CostCenterComparativeController>(CostCenterComparativeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
