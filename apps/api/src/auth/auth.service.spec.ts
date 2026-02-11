import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../db/prisma/prisma.service';
import { PgService } from '../db/pg/pg.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  const prismaMock = {
    user: {
      findFirst: jest.fn(),
    },
  };
  const pgMock = {
    query: jest.fn(),
  };
  const jwtMock = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PgService, useValue: pgMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve rejeitar quando identificador nao for informado', async () => {
    await expect(service.login('', '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deve rejeitar quando usuario nao existir', async () => {
    jest
      .spyOn(service as any, 'findUserByIdentifier')
      .mockResolvedValue(null);

    await expect(service.login('nao-existe', '123456')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve rejeitar quando usuario nao tiver codigoUsuarioVrMaster', async () => {
    const compareSpy = jest.spyOn(bcrypt, 'compare');
    jest.spyOn(service as any, 'findUserByIdentifier').mockResolvedValue({
      id: 1,
      activeStatus: true,
      password: 'hash',
      codigoUsuarioVrMaster: null,
    });

    await expect(service.login('user@test.com', '123456')).rejects.toThrow(
      'Usuario sem codigoUsuarioVrMaster vinculado.',
    );
    expect(compareSpy).not.toHaveBeenCalled();
  });

  it('deve rejeitar quando usuario estiver inativo', async () => {
    jest.spyOn(service as any, 'findUserByIdentifier').mockResolvedValue({
      id: 1,
      activeStatus: false,
      password: 'hash',
      codigoUsuarioVrMaster: 999,
    });

    await expect(service.login('user@test.com', '123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deve rejeitar quando senha for invalida', async () => {
    jest.spyOn(service as any, 'findUserByIdentifier').mockResolvedValue({
      id: 1,
      activeStatus: true,
      password: 'hash',
      codigoUsuarioVrMaster: 999,
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(service.login('user@test.com', '123456')).rejects.toThrow(
      'Senha invalida',
    );
  });

  it('deve gerar token quando login for valido', async () => {
    jest.spyOn(service as any, 'findUserByIdentifier').mockResolvedValue({
      id: 10,
      activeStatus: true,
      password: 'hash',
      codigoUsuarioVrMaster: 1000,
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    jwtMock.sign.mockReturnValue('jwt-token');

    await expect(service.login('user@test.com', '123456')).resolves.toEqual({
      accessToken: 'jwt-token',
    });
    expect(jwtMock.sign).toHaveBeenCalledWith({ userId: 10 });
  });
});
