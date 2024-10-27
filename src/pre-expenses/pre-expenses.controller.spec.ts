import { Test, TestingModule } from '@nestjs/testing';
import { PreExpensesController } from './pre-expenses.controller';
import { PreExpensesService } from './pre-expenses.service';

describe('PreExpensesController', () => {
  let controller: PreExpensesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreExpensesController],
      providers: [PreExpensesService],
    }).compile();

    controller = module.get<PreExpensesController>(PreExpensesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
