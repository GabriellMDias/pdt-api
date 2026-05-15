import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/auth/guards/permissions.guard";
import { Permissions } from "src/auth/decorators/permissions.decorator";
import { DailyResultConfigService } from "./daily-result-config.service";
import { DailyResultLineConfigEntity } from "./entities/daily-result-line-config.entity";
import { CreateDailyResultLineConfigDto } from "./dto/create-daily-result-line-config.dto";
import { UpdateDailyResultLineConfigDto } from "./dto/update-daily-result-line-config.dto";

@Controller("dre/daily-result-config")
@ApiTags("dre")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DailyResultConfigController {
  constructor(private readonly service: DailyResultConfigService) {}

  @Get()
  @Permissions("dre:configurar-dre")
  @ApiOkResponse({ type: DailyResultLineConfigEntity, isArray: true })
  findAll(@Query("includeInactive") includeInactive?: string) {
    return this.service.findAll(includeInactive === "true");
  }

  @Get("vrmaster-dre-options")
  @Permissions("dre:configurar-dre")
  findVrMasterDreOptions() {
    return this.service.findVrMasterDreOptions();
  }

  @Post()
  @Permissions("dre:configurar-dre")
  @ApiCreatedResponse({ type: DailyResultLineConfigEntity })
  create(@Body() dto: CreateDailyResultLineConfigDto) {
    return this.service.create(dto);
  }

  @Post("seed-default")
  @Permissions("dre:configurar-dre")
  seedDefault() {
    return this.service.seedDefault();
  }

  @Patch(":id")
  @Permissions("dre:configurar-dre")
  @ApiOkResponse({ type: DailyResultLineConfigEntity })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDailyResultLineConfigDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Permissions("dre:configurar-dre")
  @ApiOkResponse({ type: DailyResultLineConfigEntity })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
