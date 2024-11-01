import { Test, TestingModule } from '@nestjs/testing';
import { DreService } from './dre.service';

describe('DreService', () => {
  let service: DreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DreService],
    }).compile();

    service = module.get<DreService>(DreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
