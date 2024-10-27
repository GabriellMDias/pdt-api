import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseApportionmentsService } from './expense-apportionments.service';

describe('ExpenseApportionmentsService', () => {
  let service: ExpenseApportionmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseApportionmentsService],
    }).compile();

    service = module.get<ExpenseApportionmentsService>(ExpenseApportionmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
