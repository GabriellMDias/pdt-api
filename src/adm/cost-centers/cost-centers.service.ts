import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { PgService } from 'src/db/pg/pg.service';
import { CostCenterVr } from './entities/cost-center-vr.entity';
import { CostCenterTypeItemDto, CreateCostCenterTypeDto } from './dto/create-cost-center-type.dto';
import { UpdateCostCenterTypeDto } from './dto/update-cost-center-type.dto';
import { CostCenter, Prisma } from '@prisma/client';
import { CostCenterTypeVr, CostCenterTypeVrGrouped } from './entities/cost-center-type-vr.entity';
import { CostCenterEntity } from './entities/cost-center.entity';
import { SnkApiService } from 'src/snk-api/snk-api.service';
import { CostCenterSnk } from './entities/cost-center-snk.entity';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService, private pg: PgService, private snk: SnkApiService) {}

  async createCostCenter(createCostCenterDto: CreateCostCenterDto): Promise<CostCenter> {
    return this.prisma.costCenter.create({data: createCostCenterDto});
  }

  async findAllCostCenters(): Promise<CostCenter[]> {
    return this.prisma.costCenter.findMany();
  }

  async findOneCostCenter(id: number): Promise<CostCenter | null> {
    return this.prisma.costCenter.findUnique({where: {id}});
  }

  async updateCostCenter(id: number, updateCostCenterDto: UpdateCostCenterDto): Promise<CostCenter> {
    return this.prisma.costCenter.update({
      where: { id },
      data: updateCostCenterDto
    });
  }

  async removeCostCenter(id: number) {
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

  async getCostCenterTypeFromVR() {
    try {
      const costCenterTypesFromVrQuery = `
        select 
          tcc.id as id_costcentertype_vr,
          tcc.descricao as description,
          CASE WHEN tcc.id_situacaocadastro = 1 THEN true ELSE false END as "activeStatus",
          cc.id as "costCenterId",
          cci.id_loja as "storeId",
          cci.percentual as percentage
        from tipocentrocusto tcc
        left join centrocustoitem cci on cci.id_centrocusto = tcc.id
        join centrocusto cc on cc.centrocusto1 = cci.centrocusto1 and cc.centrocusto2  = cci.centrocusto2 and cc.centrocusto3  = cci.centrocusto3 and cc.nivel = 3
        order by tcc.id;
      `
      const costCenterTypesFromVrResult = await this.pg.query<CostCenterTypeVr>(costCenterTypesFromVrQuery)

      const costCenterTypesFromVrGrouped: CostCenterTypeVrGrouped[] = Object.values(
        costCenterTypesFromVrResult.rows.reduce((acc: Record<number, any>, item: CostCenterTypeVr) => {
          const key = item.id_costcentertype_vr;
      
          if (!acc[key]) {
            acc[key] = {
              id_costcentertype_vr: item.id_costcentertype_vr,
              description: item.description,
              activeStatus: item.activeStatus,
              items: []
            };
          }
      
          acc[key].items.push({
            costCenterId: item.costCenterId,
            storeId: item.storeId,
            percentage: item.percentage
          });
      
          return acc;
        }, {} as Record<number, any>)
      );

      for(const costCenterTypeFromVr of costCenterTypesFromVrGrouped) {
        const costCenterType = await this.prisma.costCenterType.upsert({
          where: {id_costcentertype_vr: costCenterTypeFromVr.id_costcentertype_vr},
          update: {
            description: costCenterTypeFromVr.description,
            activeStatus: costCenterTypeFromVr.activeStatus
          },
          create: {
            id_costcentertype_vr: costCenterTypeFromVr.id_costcentertype_vr,
            description: costCenterTypeFromVr.description,
            activeStatus: costCenterTypeFromVr.activeStatus,
            verified: false,
            useParticipationStore: false,
            useParticipationCostCenter: false
          }
        })

        for(const costCenterTypeItemFromVr of costCenterTypeFromVr.items) {
          const existingItem = await this.prisma.costCenterTypeItem.findFirst({
            where: {
              costCenterTypeId: costCenterType.id,
              costCenterId: costCenterTypeItemFromVr.costCenterId,
              storeId: costCenterTypeItemFromVr.storeId
            }
          });

          if (existingItem) {
            await this.prisma.costCenterTypeItem.update({
              where: { id: existingItem.id },
              data: {
                percentage: costCenterTypeItemFromVr.percentage,
                participation: false
              }
            });
            continue;
          }

          await this.prisma.costCenterTypeItem.create({
            data: {
              costCenterTypeId: costCenterType.id,
              costCenterId: costCenterTypeItemFromVr.costCenterId,
              storeId: costCenterTypeItemFromVr.storeId,
              percentage: costCenterTypeItemFromVr.percentage,
              participation: false
            }
          });
        }
      }

      return costCenterTypesFromVrGrouped
    } catch (error) {
      console.error('An error ocurred when updating cost center types: ', error)

      throw new InternalServerErrorException('Failed to cost center types')
    }
  }

  async getCostCenterFromSankhya() { 
    const sql = `SELECT 
        CODCENCUS,
        DESCRCENCUS
    FROM TSICUS WHERE CODCENCUSPAI = 201300 AND ATIVO = 'S'`

    const costCentersSnk = await this.snk.executeQueryTyped<CostCenterSnk>(sql)

    const costCenterTypesPrisma = await this.prisma.costCenterType.findMany()

    const newCostCenterTypes = costCentersSnk.filter((ccSnk) => !costCenterTypesPrisma.map((ccP) => ccP.codcencus_sankhya).includes(ccSnk.CODCENCUS))

    for(const newCostCenterType of newCostCenterTypes){
      const sqlNewId = `select max(id) + 1 as new_id from tipocentrocusto`

      const newId = (await this.pg.query<{new_id: number}>(sqlNewId)).rows[0].new_id

      const sqlInsertCostCenterTypeInVr = `insert into tipocentrocusto
        (id, descricao, id_situacaocadastro, id_grupoeconomico, utilizapercentual) values
        ($1, $2, 1, 1, true)`

      await this.pg.query(sqlInsertCostCenterTypeInVr, [newId, newCostCenterType.DESCRCENCUS])

      const sqlInsertCostCenterTypeItemInVr = `insert into centrocustoitem (id_centrocusto, centrocusto1, centrocusto2, centrocusto3, id_loja, percentual)
        select 
        $1, centrocusto1, centrocusto2, centrocusto3, id_loja, percentual
        from
        centrocustoitem  where id_centrocusto = 21`

      await this.pg.query(sqlInsertCostCenterTypeItemInVr, [newId])

      await this.getCostCenterFromVR()
      await this.getCostCenterTypeFromVR()

      await this.prisma.costCenterType.update({where: {id_costcentertype_vr: newId}, data: {codcencus_sankhya: newCostCenterType.CODCENCUS}})
    }


    return newCostCenterTypes
  }

  async createCostCenterType(createCostCenterTypeDto: CreateCostCenterTypeDto) {
    const { costCenterTypeItems, ...data } = createCostCenterTypeDto;

    const result =  this.prisma.costCenterType.create({
      data: {
        ...data,
        costCenterTypeItems: {
          create: costCenterTypeItems
        }
      }
    });

    return result;
  }

  async updateCostCenterType(id: number, updateCostCenterTypeDto: UpdateCostCenterTypeDto) {
    const { costCenterTypeItems, ...data } = updateCostCenterTypeDto;

    return this.prisma.costCenterType.update({
      where: { id },
      data: {
        ...data,
        costCenterTypeItems: {
          create: costCenterTypeItems
        }
      }
    });
  }

  async removeCostCenterType(id: number) {
    return this.prisma.costCenterType.delete({where: {id}});
  }

  async findAllCostCenterTypes(): Promise<Prisma.CostCenterTypeGetPayload<{include: {costCenterTypeItems: true}}>[] > {
    return this.prisma.costCenterType.findMany({
      include: {
        costCenterTypeItems: true
      }
    });
  }

  async findOneCostCenterType(id: number) {
    return this.prisma.costCenterType.findUnique({where: {id}});
  }
}
