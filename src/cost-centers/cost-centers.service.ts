import { Injectable } from '@nestjs/common';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  create(createCostCenterDto: CreateCostCenterDto) {
    return this.prisma.costCenter.create({data: createCostCenterDto});
  }

  findAll() {
    return this.prisma.costCenter.findMany();
  }

  findOne(id: number) {
    return this.prisma.costCenter.findUnique({where: {id}});
  }

  update(id: number, updateCostCenterDto: UpdateCostCenterDto) {
    return this.prisma.costCenter.update({
      where: { id },
      data: updateCostCenterDto
    });
  }

  remove(id: number) {
    return this.prisma.costCenter.delete({where: {id}});
  }
}
