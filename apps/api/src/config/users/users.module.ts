import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/db/prisma/prisma.module';
import { AccountController } from './account.controller';
import { PgModule } from 'src/db/pg/pg.module';

@Module({
  controllers: [UsersController, AccountController],
  providers: [UsersService],
  imports: [PrismaModule, PgModule],
  exports: [UsersService]
})
export class UsersModule {}
