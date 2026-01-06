import { Module } from '@nestjs/common';
import { DreService } from './dre.service';
import { DreController } from './dre.controller';
import { PgModule } from 'src/db/pg/pg.module';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { ParametersModule } from 'src/config/parameters/parameters.module';

@Module({
  controllers: [DreController],
  providers: [DreService],
  imports: [PgModule, PrismaModule, ParametersModule]
})
export class DreModule {}
