import { Test, TestingModule } from '@nestjs/testing';
import { SnkApiController } from './snk-api.controller';
import { SnkApiService } from './snk-api.service';

describe('SnkApiController', () => {
  let controller: SnkApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnkApiController],
      providers: [SnkApiService],
    }).compile();

    controller = module.get<SnkApiController>(SnkApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
