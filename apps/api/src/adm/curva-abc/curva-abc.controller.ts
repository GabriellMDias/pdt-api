import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Permissions } from "src/auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/auth/guards/permissions.guard";
import { CurvaAbcQueryDto } from "./dto/curva-abc.query.dto";
import { CurvaAbcService } from "./curva-abc.service";

@Controller("curva-abc")
@ApiTags("curva-abc")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CurvaAbcController {
  constructor(private readonly curvaAbcService: CurvaAbcService) {}

  @Get()
  @Permissions("curva-abc:consultar")
  @ApiOkResponse({ type: Object, isArray: true })
  @ApiQuery({
    name: "storeId",
    required: true,
    type: Number,
    isArray: true,
    style: "form",
    explode: true,
    example: [1, 5],
  })
  @ApiQuery({
    name: "initialDate",
    required: true,
    type: String,
    example: "2026-01-01",
  })
  @ApiQuery({
    name: "finalDate",
    required: true,
    type: String,
    example: "2026-01-31",
  })
  @ApiQuery({
    name: "mercadologicoPair",
    required: false,
    type: String,
    isArray: true,
    style: "form",
    explode: true,
    example: ["1:1", "2:5"],
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCurvaAbc(@Query() dto: CurvaAbcQueryDto, @Req() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? 0);
    return this.curvaAbcService.run(userId, dto);
  }
}
