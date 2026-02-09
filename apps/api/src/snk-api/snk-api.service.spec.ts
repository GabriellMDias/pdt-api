import { Test, TestingModule } from '@nestjs/testing';
import { SnkApiService } from './snk-api.service';

describe('SnkApiService', () => {
  let service: SnkApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SnkApiService],
    }).compile();

    service = module.get<SnkApiService>(SnkApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
