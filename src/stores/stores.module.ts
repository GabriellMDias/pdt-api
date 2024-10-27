import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [StoresController],
  providers: [StoresService],
  imports: [PrismaModule]
})
export class StoresModule {}
