import { Injectable } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreatePreExpenseDto } from './dto/create-pre-expense.dto';
import { UpdatePreExpenseDto } from './dto/update-pre-expense.dto';

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

  findAllExpenseApport() {
    return this.prisma.expenseApportionment.findMany();
  }

  findOneExpenseApport(id: number) {
    return this.prisma.expenseApportionment.findUnique({where: {id}});
  }

  removeExpenseApport(id: number) {
    return this.prisma.expenseApportionment.delete({where: {id}});
  }

  preExpenseCreate(createPreExpenseDto: CreatePreExpenseDto) {
      return this.prisma.preExpense.create({data: createPreExpenseDto});
    }
  
    preExpenseFindAll() {
      return this.prisma.preExpense.findMany();
    }
  
    preExpenseFindOne(id: number) {
      return this.prisma.preExpense.findUnique({where: {id}});
    }
  
    preExpenseUpdate(id: number, updatePreExpenseDto: UpdatePreExpenseDto) {
      return this.prisma.preExpense.update({
        where: { id },
        data: updatePreExpenseDto
      });
    }
  
    preExpenseRemove(id: number) {
      return this.prisma.preExpense.delete({where: {id}});
    }

  PreExpenseApportFindAll() {
    return this.prisma.preExpenseApportionment.findMany();
  }

  PreExpenseApportFindOne(id: number) {
    return this.prisma.preExpenseApportionment.findUnique({where: {id}});
  }

  PreExpenseApportRemove(id: number) {
    return this.prisma.preExpenseApportionment.delete({where: {id}});
  }
  }
