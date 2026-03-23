import { Module } from '@nestjs/common';
import { PgModule } from 'src/db/pg/pg.module';
import { ProducaoService } from './producao.service';

@Module({
  imports: [PgModule],
  providers: [ProducaoService],
  exports: [ProducaoService],
})
export class ProducaoModule {}
