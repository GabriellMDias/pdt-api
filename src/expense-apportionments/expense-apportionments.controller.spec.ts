import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseApportionmentsController } from './expense-apportionments.controller';
import { ExpenseApportionmentsService } from './expense-apportionments.service';

describe('ExpenseApportionmentsController', () => {
  let controller: ExpenseApportionmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseApportionmentsController],
      providers: [ExpenseApportionmentsService],
    }).compile();

    controller = module.get<ExpenseApportionmentsController>(ExpenseApportionmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
