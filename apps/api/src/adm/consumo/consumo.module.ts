import { Module } from "@nestjs/common";
import { PgModule } from "src/db/pg/pg.module";
import { StockMovementModule } from "src/stock-movement/stock-movement.module";
import { ConsumoService } from "./consumo.service";

@Module({
  imports: [PgModule, StockMovementModule],
  providers: [ConsumoService],
  exports: [ConsumoService],
})
export class ConsumoModule {}
