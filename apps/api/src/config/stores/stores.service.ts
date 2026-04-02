import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { PrismaService } from "src/db/prisma/prisma.service";
import { PgService } from "src/db/pg/pg.service";
import { StoreVr } from "./entities/store-vr.entity";

@Injectable()
export class StoresService {
  constructor(
    private prisma: PrismaService,
    private pg: PgService,
  ) {}

  create(createStoreDto: CreateStoreDto) {
    return this.prisma.store.create({ data: createStoreDto });
  }

  findAll() {
    return this.prisma.store.findMany({
      where: {
        id: {
          gt: 0,
        },
      },
      orderBy: { id: "asc" },
    });
  }

  findOne(id: number) {
    return this.prisma.store.findUnique({ where: { id } });
  }

  update(id: number, updateStoreDto: UpdateStoreDto) {
    return this.prisma.store.update({
      where: { id },
      data: updateStoreDto,
    });
  }

  remove(id: number) {
    return this.prisma.store.delete({ where: { id } });
  }

  async getStoresFromVR() {
    try {
      const storesFromVrQuery =
        "SELECT l.id, l.descricao AS description, f.cnpj FROM loja l JOIN fornecedor f ON f.id = l.id_fornecedor;";

      const storesFromVrResult =
        await this.pg.query<StoreVr>(storesFromVrQuery);

      for (const storeFromVr of storesFromVrResult.rows) {
        await this.prisma.store.upsert({
          where: { id: storeFromVr.id },
          update: {
            description: storeFromVr.description,
          },
          create: {
            id: storeFromVr.id,
            description: storeFromVr.description,
            storeName: storeFromVr.description,
            activeStatus: false,
            cnpj: storeFromVr.cnpj.toString(),
          },
        });
      }

      return storesFromVrResult.rows;
    } catch (error) {
      console.error("An error ocurred when updating stores: ", error);

      throw new InternalServerErrorException("Failed to update stores");
    }
  }
}
