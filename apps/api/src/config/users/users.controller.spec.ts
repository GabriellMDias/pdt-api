import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

jest.mock('../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuardMock {},
}));

jest.mock('../../auth/guards/permissions.guard', () => ({
  PermissionsGuard: class PermissionsGuardMock {},
}));

jest.mock('../../auth/decorators/permissions.decorator', () => ({
  Permissions: () => () => undefined,
  PermissionsAny: () => () => undefined,
}));

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
