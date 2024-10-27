import { Injectable } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  create(createExpenseDto: CreateExpenseDto) {
    return this.prisma.expense.create({data: createExpenseDto});
  }

  findAll() {
    return this.prisma.expense.findMany();
  }

  findOne(id: number) {
    return this.prisma.expense.findUnique({where: {id}, include: {store: true}});
  }

  update(id: number, updateExpenseDto: UpdateExpenseDto) {
    return this.prisma.expense.update({
      where: { id },
      data: updateExpenseDto
    });
  }

  remove(id: number) {
    return this.prisma.expense.delete({where: {id}});
  }
}
