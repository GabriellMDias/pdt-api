import { Injectable } from '@nestjs/common';
import { CreateExpenseApportionmentDto } from './dto/create-expense-apportionment.dto';
import { UpdateExpenseApportionmentDto } from './dto/update-expense-apportionment.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExpenseApportionmentsService {
  constructor(private prisma: PrismaService) {}

  create(createExpenseApportionmentDto: CreateExpenseApportionmentDto) {
    return this.prisma.expenseApportionment.create({data: createExpenseApportionmentDto});
  }

  findAll() {
    return this.prisma.expenseApportionment.findMany();
  }

  findOne(id: number) {
    return this.prisma.expenseApportionment.findUnique({where: {id}});
  }

  update(id: number, updateExpenseApportionmentDto: UpdateExpenseApportionmentDto) {
    return this.prisma.expenseApportionment.update({
      where: { id },
      data: updateExpenseApportionmentDto
    });
  }

  remove(id: number) {
    return this.prisma.expenseApportionment.delete({where: {id}});
  }
}
