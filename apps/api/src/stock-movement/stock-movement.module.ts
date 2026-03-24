import { Module } from "@nestjs/common";
import { PgModule } from "src/db/pg/pg.module";
import { ProductAssociationResolverService } from "./product-association-resolver.service";
import { StockFreezeResolverService } from "./stock-freeze-resolver.service";
import { StockMovementService } from "./stock-movement.service";
import { TransactionLogService } from "./transaction-log.service";

@Module({
  imports: [PgModule],
  providers: [
    ProductAssociationResolverService,
    StockFreezeResolverService,
    StockMovementService,
    TransactionLogService,
  ],
  exports: [
    ProductAssociationResolverService,
    StockFreezeResolverService,
    StockMovementService,
    TransactionLogService,
  ],
})
export class StockMovementModule {}
