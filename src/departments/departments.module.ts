import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PgModule } from 'src/pg/pg.module';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  imports: [PrismaModule, PgModule]
})
export class DepartmentsModule {}
