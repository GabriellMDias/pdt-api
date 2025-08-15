import { Module } from '@nestjs/common';
import { SpedController } from './sped.controller';
import { SpedService } from './sped.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [SpedController],
  providers: [SpedService],
  imports: [PrismaModule]
})
export class SpedModule {}
