import { Controller, UseGuards, Post, ValidationPipe, Body } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/auth/guards/permissions.guard";
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { RupturaService } from "./ruptura.service";
import { AtualizarPrateleiraQueryDto } from "./dto/atualizar-prateleira.query.dto";

@Controller("ruptura")
@ApiTags("ruptura")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RupturaController {
  constructor(private readonly rupturaService: RupturaService) {}

  @Post("atualizar-prateleira")
  @Permissions("ruptura:atualizar-prateleira")
  atualizarPrateleiras(
    @Body(new ValidationPipe({ transform: true }))
    dto: AtualizarPrateleiraQueryDto,
  ) {
    return this.rupturaService.atualizarPrateleiras(dto)
  }
}
