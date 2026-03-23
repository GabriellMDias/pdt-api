import { Module } from '@nestjs/common';
import { PgModule } from 'src/db/pg/pg.module';
import { BalancoService } from './balanco.service';

@Module({
  imports: [PgModule],
  providers: [BalancoService],
  exports: [BalancoService],
})
export class BalancoModule {}
