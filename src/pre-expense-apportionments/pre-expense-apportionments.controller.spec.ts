import { Test, TestingModule } from '@nestjs/testing';
import { PreExpenseApportionmentsController } from './pre-expense-apportionments.controller';
import { PreExpenseApportionmentsService } from './pre-expense-apportionments.service';

describe('PreExpenseApportionmentsController', () => {
  let controller: PreExpenseApportionmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreExpenseApportionmentsController],
      providers: [PreExpenseApportionmentsService],
    }).compile();

    controller = module.get<PreExpenseApportionmentsController>(PreExpenseApportionmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
