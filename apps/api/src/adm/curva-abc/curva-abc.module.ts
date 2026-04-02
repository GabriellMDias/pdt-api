import { Module } from "@nestjs/common";
import { PermissionsModule } from "src/config/permissions/permissions.module";
import { PgModule } from "src/db/pg/pg.module";
import { PrismaModule } from "src/db/prisma/prisma.module";
import { CurvaAbcController } from "./curva-abc.controller";
import { CurvaAbcService } from "./curva-abc.service";

@Module({
  controllers: [CurvaAbcController],
  providers: [CurvaAbcService],
  imports: [PgModule, PermissionsModule, PrismaModule],
})
export class CurvaAbcModule {}
