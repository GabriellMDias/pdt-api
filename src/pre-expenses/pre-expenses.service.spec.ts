import { Test, TestingModule } from '@nestjs/testing';
import { PreExpensesService } from './pre-expenses.service';

describe('PreExpensesService', () => {
  let service: PreExpensesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreExpensesService],
    }).compile();

    service = module.get<PreExpensesService>(PreExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
