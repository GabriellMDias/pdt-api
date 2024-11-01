import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PgService } from 'src/pg/pg.service';
import { DepartmentVr } from './entities/department-vr.entity';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService, private pg: PgService) {}

  create(createDepartmentDto: CreateDepartmentDto) {
    return this.prisma.department.create({data: createDepartmentDto});
  }

  findAll() {
    return this.prisma.department.findMany();
  }

  findOne(id: number) {
    return this.prisma.department.findUnique({where: {id}});
  }

  update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto
    });
  }

  remove(id: number) {
    return this.prisma.department.delete({where: {id}});
  }

  async getDepartmentsFromVr() {
    try {
      const departmentsFromVrQuery = `
        SELECT
        m.id, 
        CASE
          WHEN mnv1.id_centrocusto IS NULL THEN 0
          ELSE mnv1.id_centrocusto
        END AS "costCenterId",
        m.descricao AS description,
        m.mercadologico1 AS "departmentVrId1",
        m.mercadologico2 AS "departmentVrId2",
        m.nivel AS "level"
      FROM mercadologico m 
      /*JOIN para obter o centro de custo do mercadologico com maior nivel*/
      JOIN (SELECT 
            mercadologico1, 
            id_centrocusto 
          FROM mercadologico WHERE nivel = 1) mnv1 ON mnv1.mercadologico1 = m.mercadologico1 
      WHERE m.nivel IN (1, 2)
      `

      const departmentsFromVrResult = await this.pg.query<DepartmentVr>(departmentsFromVrQuery)  
      
      for(const departmentFromVr of departmentsFromVrResult.rows){
        await this.prisma.department.upsert({
          where: {
            id: departmentFromVr.id
          },
          update: {
            costCenterId: departmentFromVr.costCenterId,
            description: departmentFromVr.description,
            departmentVrId1: departmentFromVr.departmentVrId1,
            departmentVrId2: departmentFromVr.departmentVrId2,
            level: departmentFromVr.level
          },
          create: departmentFromVr
        })
      }

      return departmentsFromVrResult.rows
    } catch (error) {
      console.error('An error ocurred when updating departments: ', error)

      throw new InternalServerErrorException('Failed to update departments')
    }
  }
}
