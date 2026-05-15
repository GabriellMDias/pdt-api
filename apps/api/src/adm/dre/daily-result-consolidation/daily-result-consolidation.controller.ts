import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { DailyResultConsolidationService } from './daily-result-consolidation.service';
import { DailyResultConsolidationConfirmDto } from './dto/daily-result-consolidation-confirm.dto';
import { DailyResultConsolidationDryRunDto } from './dto/daily-result-consolidation-dry-run.dto';

@Controller('dre/consolidation')
@ApiTags('dre')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DailyResultConsolidationController {
  constructor(private readonly service: DailyResultConsolidationService) {}

  @Post('dry-run')
  @Permissions('dre:consolidar')
  @ApiBody({ type: DailyResultConsolidationDryRunDto })
  @ApiOkResponse({ description: 'Dry-run da consolidação do Resultado Diário' })
  dryRun(
    @Body(new ValidationPipe({ transform: true }))
    dto: DailyResultConsolidationDryRunDto,
  ) {
    return this.service.dryRun(dto);
  }

  @Post('confirm')
  @HttpCode(200)
  @Permissions('dre:consolidar')
  @ApiBody({ type: DailyResultConsolidationConfirmDto })
  @ApiOkResponse({ description: 'Confirma e grava a consolidaÃ§Ã£o do Resultado DiÃ¡rio' })
  confirm(
    @Body(new ValidationPipe({ transform: true }))
    dto: DailyResultConsolidationConfirmDto,
    @Req() req: any,
  ) {
    const userId = Number(req.user?.id ?? req.user?.userId);
    return this.service.confirm(
      dto,
      Number.isFinite(userId) && userId > 0 ? userId : null,
    );
  }
}
