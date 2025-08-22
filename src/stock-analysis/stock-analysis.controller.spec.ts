import { Test, TestingModule } from '@nestjs/testing';
import { StockAnalysisController } from './stock-analysis.controller';
import { StockAnalysisService } from './stock-analysis.service';

describe('StockAnalysisController', () => {
  let controller: StockAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockAnalysisController],
      providers: [
        {
          provide: StockAnalysisService,
          useValue: { resumoMes: jest.fn(), resumoDia: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<StockAnalysisController>(StockAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
