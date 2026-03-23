import { Module } from '@nestjs/common';
import { PgModule } from 'src/db/pg/pg.module';
import { ConsumoService } from './consumo.service';

@Module({
  imports: [PgModule],
  providers: [ConsumoService],
  exports: [ConsumoService],
})
export class ConsumoModule {}
