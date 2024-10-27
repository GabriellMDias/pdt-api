import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyResultsService } from './monthly-results.service';

describe('MonthlyResultsService', () => {
  let service: MonthlyResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonthlyResultsService],
    }).compile();

    service = module.get<MonthlyResultsService>(MonthlyResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
