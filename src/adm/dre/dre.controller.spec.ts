import { Test, TestingModule } from '@nestjs/testing';
import { DreController } from './dre.controller';
import { DreService } from './dre.service';

describe('DreController', () => {
  let controller: DreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DreController],
      providers: [DreService],
    }).compile();

    controller = module.get<DreController>(DreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
