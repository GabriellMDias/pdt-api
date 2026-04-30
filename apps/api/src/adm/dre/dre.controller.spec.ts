import { Test, TestingModule } from '@nestjs/testing';
import { DreController } from './dre.controller';
import { DreService } from './dre.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

describe('DreController', () => {
  let controller: DreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DreController],
      providers: [{ provide: DreService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DreController>(DreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
