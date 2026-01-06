import { Test, TestingModule } from '@nestjs/testing';
import { PreExpenseApportionmentsService } from './pre-expense-apportionments.service';

describe('PreExpenseApportionmentsService', () => {
  let service: PreExpenseApportionmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreExpenseApportionmentsService],
    }).compile();

    service = module.get<PreExpenseApportionmentsService>(PreExpenseApportionmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
