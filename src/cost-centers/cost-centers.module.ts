import { Module } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CostCentersController } from './cost-centers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService],
  imports: [PrismaModule]
})
export class CostCentersModule {}
