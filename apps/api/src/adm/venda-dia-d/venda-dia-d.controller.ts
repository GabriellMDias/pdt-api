import { Controller, Get, Query, Req, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Permissions } from "src/auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/auth/guards/permissions.guard";
import { VendaDiaDQueryDto, VendaDiaDViewType } from "./dto/venda-dia-d.query.dto";
import { VendaDiaDService } from "./venda-dia-d.service";

@Controller("venda-dia-d")
@ApiTags("venda-dia-d")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class VendaDiaDController {
  constructor(private readonly vendaDiaDService: VendaDiaDService) {}

  @Get()
  @Permissions("venda-dia-d:consultar")
  @ApiOkResponse({ type: Object, isArray: true })
  @ApiQuery({ name: "storeId", required: true, type: Number, isArray: true, style: "form", explode: true, example: [1, 5] })
  @ApiQuery({ name: "initialDate", required: true, type: String, example: "2026-01-01" })
  @ApiQuery({ name: "finalDate", required: true, type: String, example: "2026-01-31" })
  @ApiQuery({ name: "viewType", required: true, enum: VendaDiaDViewType, enumName: "VendaDiaDViewType" })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getVendaDiaD(@Query() dto: VendaDiaDQueryDto, @Req() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? 0);
    return this.vendaDiaDService.run(userId, dto);
  }
}
