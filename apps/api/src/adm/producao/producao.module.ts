import { Module } from "@nestjs/common";
import { PgModule } from "src/db/pg/pg.module";
import { StockMovementModule } from "src/stock-movement/stock-movement.module";
import { ProducaoService } from "./producao.service";

@Module({
  imports: [PgModule, StockMovementModule],
  providers: [ProducaoService],
  exports: [ProducaoService],
})
export class ProducaoModule {}
