import { Module } from '@nestjs/common';
import { PgModule } from 'src/db/pg/pg.module';
import { TrocaService } from './troca.service';

@Module({
  imports: [PgModule],
  providers: [TrocaService],
  exports: [TrocaService],
})
export class TrocaModule {}
