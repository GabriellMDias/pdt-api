import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { PgModule } from 'src/db/pg/pg.module';

@Module({
  controllers: [StoresController],
  providers: [StoresService],
  imports: [PrismaModule, PgModule],
  exports: [StoresService]
})
export class StoresModule {}
