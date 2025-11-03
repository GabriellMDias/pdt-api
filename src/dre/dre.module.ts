import { Module } from '@nestjs/common';
import { DreService } from './dre.service';
import { DreController } from './dre.controller';
import { PgModule } from 'src/pg/pg.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ParametersModule } from 'src/parameters/parameters.module';

@Module({
  controllers: [DreController],
  providers: [DreService],
  imports: [PgModule, PrismaModule, ParametersModule]
})
export class DreModule {}
