import { Body, Controller, Get, Post } from '@nestjs/common';
import { SnkApiService } from './snk-api.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';

@Controller('snk-api')
export class SnkApiController {
  constructor(private readonly snkApiService: SnkApiService) {}

  @Post('execute-query')
  executeQuery(@Body() dto: ExecuteQueryDto) {
    return this.snkApiService.executeQuery(dto.sql);
  }
}
