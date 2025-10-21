import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SnkApiService } from './snk-api.service';
import { SnkApiController } from './snk-api.controller';
import { ParametersModule } from 'src/parameters/parameters.module';

@Module({
  controllers: [SnkApiController],
  providers: [SnkApiService],
  imports: [ParametersModule, HttpModule],
  exports: [SnkApiService],
})
export class SnkApiModule {}
