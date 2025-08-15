import { Test, TestingModule } from '@nestjs/testing';
import { SpedService } from './sped.service';

describe('SpedService', () => {
  let service: SpedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpedService],
    }).compile();

    service = module.get<SpedService>(SpedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
