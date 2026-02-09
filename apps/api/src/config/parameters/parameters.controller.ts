import { Controller, Get, Param, Query, Patch, Body, UseGuards } from '@nestjs/common';
import { ParametersService } from './parameters.service';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parameters')
@ApiTags('parameters')
@ApiBearerAuth()
export class ParametersController {
  constructor(private readonly service: ParametersService) {}

  // Lista todos; opcionalmente calcula o effective para uma loja
  @Get()
  @Permissions('parameters:consultar')
  list(@Query('storeId') storeId?: string) {
    return this.service.listAll(storeId ? Number(storeId) : undefined);
  }

  // Resolve valor efetivo por code (com fallback)
  @Get(':code')
  @Permissions('parameters:consultar')
  getOne(
    @Param('code') code: string,
    @Query('storeId') storeId?: string
  ) {
    return this.service.getEffectiveByCode(code, storeId ? Number(storeId) : undefined);
  }

  // Edita (GLOBAL ou override por loja). Sem criar/excluir.
  @Patch(':code')
  @Permissions('parameters:editar')
  patch(@Param('code') code: string, @Body() dto: UpdateParameterDto) {
    return this.service.patchValue(code, dto);
  }
}
