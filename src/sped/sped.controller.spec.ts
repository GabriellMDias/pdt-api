import { Test, TestingModule } from '@nestjs/testing';
import { SpedController } from './sped.controller';

describe('SpedController', () => {
  let controller: SpedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpedController],
    }).compile();

    controller = module.get<SpedController>(SpedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
