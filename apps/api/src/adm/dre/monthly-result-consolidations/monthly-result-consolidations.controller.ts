import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { GetMonthlyResultConsolidationsQueryDto } from './dto/get-monthly-result-consolidations.query.dto';
import { ReverseMonthlyResultConsolidationDto } from './dto/reverse-monthly-result-consolidation.dto';
import { MonthlyResultConsolidationsService } from './monthly-result-consolidations.service';

@Controller('dre/monthly-result-consolidations')
@ApiTags('dre')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MonthlyResultConsolidationsController {
  constructor(private readonly service: MonthlyResultConsolidationsService) {}

  @Get()
  @Permissions('dre:consultar')
  @ApiOkResponse({ isArray: true })
  findStatuses(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetMonthlyResultConsolidationsQueryDto,
  ) {
    return this.service.findStatuses(dto);
  }

  @Post('reverse')
  @HttpCode(200)
  @Permissions('dre:consolidar')
  @ApiBody({ type: ReverseMonthlyResultConsolidationDto })
  @ApiOkResponse({ description: 'Estorna o status operacional da consolidação mensal' })
  reverse(
    @Body(new ValidationPipe({ transform: true }))
    dto: ReverseMonthlyResultConsolidationDto,
    @Req() req: any,
  ) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    return this.service.reverse(
      dto,
      Number.isFinite(userId) ? userId : null,
    );
  }
}
