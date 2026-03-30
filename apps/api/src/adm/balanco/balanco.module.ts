import { Module } from '@nestjs/common';
import { PgModule } from 'src/db/pg/pg.module';
import { StockMovementModule } from 'src/stock-movement/stock-movement.module';
import { BalancoService } from './balanco.service';

@Module({
  imports: [PgModule, StockMovementModule],
  providers: [BalancoService],
  exports: [BalancoService],
})
export class BalancoModule {}
