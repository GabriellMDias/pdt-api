import { Injectable } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateExpenseApportionmentDto } from './dto/create-expense-apportionment.dto';
import { UpdateExpenseApportionmentDto } from './dto/update-expense-apportionment.dto';

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

  createExpenseApport(createExpenseApportionmentDto: CreateExpenseApportionmentDto) {
    return this.prisma.expenseApportionment.create({data: createExpenseApportionmentDto});
  }

  findAllExpenseApport() {
    return this.prisma.expenseApportionment.findMany();
  }

  findOneExpenseApport(id: number) {
    return this.prisma.expenseApportionment.findUnique({where: {id}});
  }

  updateExpenseApport(id: number, updateExpenseApportionmentDto: UpdateExpenseApportionmentDto) {
    return this.prisma.expenseApportionment.update({
      where: { id },
      data: updateExpenseApportionmentDto
    });
  }

  removeExpenseApport(id: number) {
    return this.prisma.expenseApportionment.delete({where: {id}});
  }
}
