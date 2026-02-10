import { Module } from "@nestjs/common";
import { PermissionsModule } from "src/config/permissions/permissions.module";
import { PgModule } from "src/db/pg/pg.module";
import { PrismaModule } from "src/db/prisma/prisma.module";
import { VendaDiaDController } from "./venda-dia-d.controller";
import { VendaDiaDService } from "./venda-dia-d.service";

@Module({
  controllers: [VendaDiaDController],
  providers: [VendaDiaDService],
  imports: [PgModule, PermissionsModule, PrismaModule],
})
export class VendaDiaDModule {}
