import { Module } from "@nestjs/common";
import { PermissionsModule } from "src/config/permissions/permissions.module";
import { PgModule } from "src/db/pg/pg.module";
import { PrismaModule } from "src/db/prisma/prisma.module";
import { RupturaController } from "./ruptura.controller";
import { RupturaService } from "./ruptura.service";


@Module({
    controllers: [RupturaController],
    providers: [RupturaService],
    imports: [PgModule, PermissionsModule, PrismaModule]
})
export class RupturaModule {}