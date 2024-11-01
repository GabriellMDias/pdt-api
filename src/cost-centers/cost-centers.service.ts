import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PgService } from 'src/pg/pg.service';
import { CostCenterVr } from './entities/cost-center-vr.entity';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService, private pg: PgService) {}

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

  async getCostCenterFromVR() {
    try {
      const costCentersFromVrQuery = `
              SELECT 
                id,
                descricao AS description,
                CASE
                  WHEN id_situacaocadastro = 1 THEN true
                  ELSE false
                END AS "activeStatus"
              FROM centrocusto WHERE nivel = 3;
      `

      const costCentersFromVrResult = await this.pg.query<CostCenterVr>(costCentersFromVrQuery)

      for(const costCenterFromVr of costCentersFromVrResult.rows) {
        await this.prisma.costCenter.upsert({
          where: {id: costCenterFromVr.id},
          update: { description: costCenterFromVr.description, activeStatus: costCenterFromVr.activeStatus},
          create: {
            id: costCenterFromVr.id,
            description: costCenterFromVr.description, 
            activeStatus: costCenterFromVr.activeStatus
          }
        })
      }

      return costCentersFromVrResult.rows
    } catch (error) {
      console.error('An error ocurred when updating cost centers: ', error)

      throw new InternalServerErrorException('Failed to cost centers')
    }
  }
}
