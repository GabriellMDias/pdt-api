import { Injectable } from '@nestjs/common';
import { CreatePreExpenseDto } from './dto/create-pre-expense.dto';
import { UpdatePreExpenseDto } from './dto/update-pre-expense.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PreExpensesService {
  constructor(private prisma: PrismaService) {}

  create(createPreExpenseDto: CreatePreExpenseDto) {
    return this.prisma.preExpense.create({data: createPreExpenseDto});
  }

  findAll() {
    return this.prisma.preExpense.findMany();
  }

  findOne(id: number) {
    return this.prisma.preExpense.findUnique({where: {id}});
  }

  update(id: number, updatePreExpenseDto: UpdatePreExpenseDto) {
    return this.prisma.preExpense.update({
      where: { id },
      data: updatePreExpenseDto
    });
  }

  remove(id: number) {
    return this.prisma.preExpense.delete({where: {id}});
  }
}
