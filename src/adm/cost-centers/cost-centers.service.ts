import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

    this.validateCostCenterTypeItems(costCenterTypeItems);

    const costCenterTypeVrId = await this.ensureCostCenterTypeInVr({
      description: data.description,
      activeStatus: data.activeStatus,
      hasPercentage: this.hasPercentageRateio(costCenterTypeItems),
      existingVrId: data.id_costcentertype_vr,
    });

    const result = await this.prisma.costCenterType.create({
      data: {
        ...data,
        activeStatus: data.activeStatus ?? true,
        id_costcentertype_vr: costCenterTypeVrId,
        costCenterTypeItems: {
          create: costCenterTypeItems,
        },
      },
    });

    await this.syncCostCenterTypeItemsToVr(costCenterTypeVrId, costCenterTypeItems);

    return result;
  }

  async updateCostCenterType(id: number, updateCostCenterTypeDto: UpdateCostCenterTypeDto) {
    const { costCenterTypeItems, ...data } = updateCostCenterTypeDto;
    const costCenterType = await this.prisma.costCenterType.findUnique({ where: { id } });

    if (!costCenterType) {
      throw new NotFoundException(`Cost center type with ${id} does not exist.`);
    }

    if (costCenterTypeItems) {
      this.validateCostCenterTypeItems(costCenterTypeItems);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (costCenterTypeItems) {
        await tx.costCenterTypeItem.deleteMany({ where: { costCenterTypeId: id } });
      }

      return tx.costCenterType.update({
        where: { id },
        data: {
          ...data,
          costCenterTypeItems: costCenterTypeItems
            ? {
                create: costCenterTypeItems,
              }
            : undefined,
        },
      });
    });

    if (data.activeStatus !== undefined || data.description || costCenterTypeItems) {
      await this.syncCostCenterTypeToVr(costCenterType.id_costcentertype_vr, {
        activeStatus: data.activeStatus,
        description: data.description,
        hasPercentage: costCenterTypeItems ? this.hasPercentageRateio(costCenterTypeItems) : undefined,
      });
    }

    if (costCenterTypeItems) {
      await this.syncCostCenterTypeItemsToVr(costCenterType.id_costcentertype_vr, costCenterTypeItems);
    }

    return result;
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

  private validateCostCenterTypeItems(costCenterTypeItems: CostCenterTypeItemDto[]) {
    if (!costCenterTypeItems || costCenterTypeItems.length === 0) {
      throw new BadRequestException('É necessário informar itens de rateio.');
    }

    costCenterTypeItems.forEach((item) => {
      if (!item.costCenterId || !item.storeId) {
        throw new BadRequestException('Centro de custo e loja são obrigatórios nos itens de rateio.');
      }
    });

    const hasPercentage = this.hasPercentageRateio(costCenterTypeItems);
    const hasNullPercentage = costCenterTypeItems.some((item) => item.percentage === null || item.percentage === undefined);

    if (hasPercentage && hasNullPercentage) {
      throw new BadRequestException('O rateio deve ser totalmente por percentual ou totalmente por participação.');
    }

    if (!hasPercentage) {
      const hasInvalidParticipation = costCenterTypeItems.some(
        (item) => item.participation === null || item.participation === undefined
      );

      if (hasInvalidParticipation) {
        throw new BadRequestException('Informe participação em todos os itens do rateio.');
      }

      return;
    }

    const total = costCenterTypeItems.reduce((acc, item) => acc + (item.percentage ?? 0), 0);
    const roundedTotal = Math.round((total + Number.EPSILON) * 100) / 100;

    if (roundedTotal !== 100) {
      throw new BadRequestException('A soma dos percentuais deve ser 100%.');
    }
  }

  private hasPercentageRateio(costCenterTypeItems: CostCenterTypeItemDto[]) {
    return costCenterTypeItems.some((item) => item.percentage !== null && item.percentage !== undefined);
  }

  private async ensureCostCenterTypeInVr({
    description,
    activeStatus,
    hasPercentage,
    existingVrId,
  }: {
    description: string;
    activeStatus?: boolean | null;
    hasPercentage: boolean;
    existingVrId?: number;
  }) {
    if (existingVrId) {
      await this.syncCostCenterTypeToVr(existingVrId, { description, activeStatus, hasPercentage });
      return existingVrId;
    }

    const sqlNewId = `select max(id) + 1 as new_id from tipocentrocusto`;
    const newId = (await this.pg.query<{ new_id: number }>(sqlNewId)).rows[0].new_id;
    const status = activeStatus === false ? 0 : 1;

    const sqlInsertCostCenterTypeInVr = `insert into tipocentrocusto
      (id, descricao, id_situacaocadastro, id_grupoeconomico, utilizapercentual) values
      ($1, $2, $3, 1, $4)`;

    await this.pg.query(sqlInsertCostCenterTypeInVr, [newId, description, status, hasPercentage]);

    return newId;
  }

  private async syncCostCenterTypeToVr(
    costCenterTypeVrId: number,
    {
      description,
      activeStatus,
      hasPercentage,
    }: {
      description?: string;
      activeStatus?: boolean | null;
      hasPercentage?: boolean;
    }
  ) {
    const fields: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (description !== undefined) {
      params.push(description);
      fields.push(`descricao = $${params.length}`);
    }

    if (activeStatus !== undefined) {
      params.push(activeStatus === false ? 0 : 1);
      fields.push(`id_situacaocadastro = $${params.length}`);
    }

    if (hasPercentage !== undefined) {
      params.push(hasPercentage);
      fields.push(`utilizapercentual = $${params.length}`);
    }

    if (fields.length === 0) {
      return;
    }

    params.push(costCenterTypeVrId);
    await this.pg.query(`update tipocentrocusto set ${fields.join(', ')} where id = $${params.length}`, params);
  }

  private async syncCostCenterTypeItemsToVr(costCenterTypeVrId: number, costCenterTypeItems: CostCenterTypeItemDto[]) {
    await this.pg.query('delete from centrocustoitem where id_centrocusto = $1', [costCenterTypeVrId]);

    for (const item of costCenterTypeItems) {
      if (!item.costCenterId || !item.storeId) {
        continue;
      }

      const costCenterVr = await this.pg.query<{ centrocusto1: number; centrocusto2: number; centrocusto3: number }>(
        'select centrocusto1, centrocusto2, centrocusto3 from centrocusto where id = $1 and nivel = 3',
        [item.costCenterId]
      );

      const costCenterVrRow = costCenterVr.rows[0];
      if (!costCenterVrRow) {
        continue;
      }

      await this.pg.query(
        `insert into centrocustoitem (id_centrocusto, centrocusto1, centrocusto2, centrocusto3, id_loja, percentual)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          costCenterTypeVrId,
          costCenterVrRow.centrocusto1,
          costCenterVrRow.centrocusto2,
          costCenterVrRow.centrocusto3,
          item.storeId,
          item.percentage ?? 0,
        ]
      );
    }
  }
}
