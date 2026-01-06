import { Module } from "@nestjs/common";
import { PgModule } from "src/db/pg/pg.module";
import { TopController } from "./top.controller"
import { TopService } from './top.service'
import { ParametersModule } from "src/config/parameters/parameters.module";
import { PrismaModule } from "src/db/prisma/prisma.module";

@Module({
    controllers: [TopController],
    providers: [TopService],
    imports: [PgModule, PrismaModule, ParametersModule]
})
export class TopModule {}