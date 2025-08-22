import { Test, TestingModule } from '@nestjs/testing';
import { StockAnalysisService } from './stock-analysis.service';

describe('StockAnalysisService', () => {
  let service: StockAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAnalysisService,
        { provide: 'PgService', useValue: { query: jest.fn() } } as any,
      ],
    }).compile();

    service = module.get<StockAnalysisService>(StockAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
