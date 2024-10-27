import { Injectable } from '@nestjs/common';
import { CreateMonthlyResultDto } from './dto/create-monthly-result.dto';
import { UpdateMonthlyResultDto } from './dto/update-monthly-result.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MonthlyResultsService {
  constructor(private prisma: PrismaService) {}

  async create(createMonthlyResultDtos: CreateMonthlyResultDto[]) {
    return this.prisma.monthlyResult.createMany({
      data: createMonthlyResultDtos,
      skipDuplicates: true,
    });
  }

  findAll() {
    return this.prisma.monthlyResult.findMany();
  }

  findOne(id: number) {
    return this.prisma.monthlyResult.findUnique({where: {id}});
  }

  update(id: number, updateMonthlyResultDto: UpdateMonthlyResultDto) {
    return this.prisma.monthlyResult.update({
      where: { id },
      data: updateMonthlyResultDto
    });
  }

  remove(id: number) {
    return this.prisma.monthlyResult.delete({where: {id}});
  }
}
