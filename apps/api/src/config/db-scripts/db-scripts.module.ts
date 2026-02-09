import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DbScriptsService } from './db-scripts.service';
import { DbScriptsController } from './db-scripts.controller';
import { PrismaService } from 'src/db/prisma/prisma.service'; 
import { PgService } from 'src/db/pg/pg.service';


@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [DbScriptsService, PrismaService, PgService],
    controllers: [DbScriptsController],
    exports: [DbScriptsService],
})
export class DbScriptsModule {}