import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MobileSyncCatalogService } from './mobile-sync.catalog.service';
import { MobileSyncController } from './mobile-sync.controller';
import { MobileSyncService } from './mobile-sync.service';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 10,
      email: 'user@test.com',
      permissions: [],
    };
    return true;
  }
}

describe('MobileSyncController', () => {
  let app: INestApplication;

  const mobileSyncServiceMock = {
    pushEvents: jest.fn().mockResolvedValue({
      acknowledgements: [],
      summary: {
        processed: 0,
        duplicates: 0,
        temporaryErrors: 0,
        permanentErrors: 0,
      },
    }),
  };

  const mobileSyncCatalogServiceMock = {
    pullCatalog: jest.fn().mockResolvedValue({
      domain: 'rupture.products',
      storeId: 1,
      syncedAt: '2026-03-18T12:00:00.000Z',
      cursor: null,
      items: [],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MobileSyncController],
      providers: [
        { provide: MobileSyncService, useValue: mobileSyncServiceMock },
        { provide: MobileSyncCatalogService, useValue: mobileSyncCatalogServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  it('deve retornar 400 quando o payload for invalido', async () => {
    await request(app.getHttpServer())
      .post('/mobile-sync/events/push')
      .send({
        events: [
          {
            eventId: 'invalido',
            eventType: '',
            schemaVersion: 0,
            payload: 'nao-e-objeto',
          },
        ],
      })
      .expect(400);

    expect(mobileSyncServiceMock.pushEvents).not.toHaveBeenCalled();
  });

  it('deve retornar 400 quando o pull de catalogo for invalido', async () => {
    await request(app.getHttpServer())
      .post('/mobile-sync/catalog/pull')
      .send({
        domain: 'rupture.products',
        storeId: 0,
      })
      .expect(400);

    expect(mobileSyncCatalogServiceMock.pullCatalog).not.toHaveBeenCalled();
  });
});
