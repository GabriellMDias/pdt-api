import { Module } from '@nestjs/common';
import { ParametersController } from './parameters.controller';
import { ParametersService } from './parameters.service';
import { PrismaService } from '../../db/prisma/prisma.service';

@Module({
  controllers: [ParametersController],
  providers: [ParametersService, PrismaService],
  exports: [ParametersService],
})
export class ParametersModule {}
