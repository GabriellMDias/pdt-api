import { Module } from "@nestjs/common";
import { PgModule } from "src/db/pg/pg.module";
import { StockMovementModule } from "src/stock-movement/stock-movement.module";
import { TrocaService } from "./troca.service";

@Module({
  imports: [PgModule, StockMovementModule],
  providers: [TrocaService],
  exports: [TrocaService],
})
export class TrocaModule {}
