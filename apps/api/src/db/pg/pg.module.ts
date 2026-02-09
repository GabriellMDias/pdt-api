import { Module } from '@nestjs/common';
import { PgService } from './pg.service';
import { PdtConnectBootstrapService } from './pdtconnect.bootstrap.service';

@Module({
  providers: [PgService, PdtConnectBootstrapService],
  exports: [PgService]
})
export class PgModule {}
