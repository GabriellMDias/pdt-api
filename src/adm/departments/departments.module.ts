import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { PgModule } from 'src/db/pg/pg.module';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  imports: [PrismaModule, PgModule],
  exports: [DepartmentsService]
})
export class DepartmentsModule {}
