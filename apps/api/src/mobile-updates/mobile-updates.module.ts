import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { MobileUpdatesAdminController } from './mobile-updates-admin.controller';
import { MobileUpdatesPublicController } from './mobile-updates-public.controller';
import { MobileUpdatesService } from './mobile-updates.service';
import { MobileUpdatesStorage } from './mobile-updates.storage';

@Module({
  imports: [PrismaModule],
  controllers: [MobileUpdatesPublicController, MobileUpdatesAdminController],
  providers: [MobileUpdatesService, MobileUpdatesStorage],
  exports: [MobileUpdatesService],
})
export class MobileUpdatesModule {}
