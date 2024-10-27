import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyResultsController } from './monthly-results.controller';
import { MonthlyResultsService } from './monthly-results.service';

describe('MonthlyResultsController', () => {
  let controller: MonthlyResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlyResultsController],
      providers: [MonthlyResultsService],
    }).compile();

    controller = module.get<MonthlyResultsController>(MonthlyResultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
