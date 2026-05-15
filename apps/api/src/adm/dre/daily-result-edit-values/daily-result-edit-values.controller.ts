import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { DailyResultEditValuesService } from './daily-result-edit-values.service';
import { GetDailyResultEditValuesQueryDto } from './dto/get-daily-result-edit-values.query.dto';
import { UpdateDailyResultEditValuesDto } from './dto/update-daily-result-edit-values.dto';

@Controller('dre/daily-result-edit-values')
@ApiTags('dre')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DailyResultEditValuesController {
  constructor(private readonly service: DailyResultEditValuesService) {}

  @Get()
  @Permissions('dre:consultar')
  @ApiQuery({ name: 'month', required: true, example: '2026-05' })
  @ApiQuery({ name: 'storeId', required: true, type: Number, example: 1 })
  @ApiOkResponse({ description: 'Daily result editable values for one month and store' })
  findEditableValues(
    @Query(new ValidationPipe({ transform: true }))
    dto: GetDailyResultEditValuesQueryDto,
  ) {
    return this.service.findEditableValues(dto);
  }

  @Put()
  @Permissions('dre:consolidar')
  @ApiBody({ type: UpdateDailyResultEditValuesDto })
  @ApiOkResponse({ description: 'Manual direct-field edits saved to MonthlyResult' })
  updateEditableValues(
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateDailyResultEditValuesDto,
    @Req() req: any,
  ) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    return this.service.updateEditableValues(
      dto,
      Number.isFinite(userId) ? userId : null,
    );
  }
}
