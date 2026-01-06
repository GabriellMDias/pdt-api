import { Injectable } from '@nestjs/common';
import { CreatePreExpenseApportionmentDto } from './dto/create-pre-expense-apportionment.dto';
import { UpdatePreExpenseApportionmentDto } from './dto/update-pre-expense-apportionment.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class PreExpenseApportionmentsService {
  constructor(private prisma: PrismaService) {}

  create(createPreExpenseApportionmentDto: CreatePreExpenseApportionmentDto) {
    return this.prisma.preExpenseApportionment.create({data: createPreExpenseApportionmentDto});
  }

  findAll() {
    return this.prisma.preExpenseApportionment.findMany();
  }

  findOne(id: number) {
    return this.prisma.preExpenseApportionment.findUnique({where: {id}});
  }

  update(id: number, updatePreExpenseApportionmentDto: UpdatePreExpenseApportionmentDto) {
    return this.prisma.preExpenseApportionment.update({
      where: { id },
      data: updatePreExpenseApportionmentDto
    });
  }

  remove(id: number) {
    return this.prisma.preExpenseApportionment.delete({where: {id}});
  }
}
