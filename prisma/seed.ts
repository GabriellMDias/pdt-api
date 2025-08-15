import { PrismaClient } from "@prisma/client";
import * as permissionsData from './permissions.json'
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roundsOfHashing = 10;

async function main() {
    const adminPassword = '4gr0mn5'; // Troque por algo seguro
    const hashedPassword = await bcrypt.hash(adminPassword, roundsOfHashing);

    const store0 = await prisma.store.upsert({
      where: {id: 0},
      update: {},
      create: {
        id: 0,
        storeName: 'Sem loja',
        description: 'Sem Loja',
        activeStatus: true,
        cnpj: ''
      }
    })

    const costCenter0 = await prisma.costCenter.upsert({
      where: {id: 0},
      update: {},
      create: {
        id: 0,
        description: "Sem Centro Custo",
        activeStatus: true
      }
    })

    const admin = await prisma.user.upsert({
      where: { id: 0 },
      update: {},
      create: {
        id: 0,
        name: 'Administrador',
        email: 'admin@admin.com',
        password: hashedPassword,
      },
    });

    const permissions = await prisma.permission.createMany({
      data: permissionsData,
      skipDuplicates: true,
    });

    const statusAnalise = await prisma.statusAnalise.createMany({
      data: [
        {
          id: 0,
          descricao: "Erro"
        },
        {
          id: 1,
          descricao: "Processo Finalizado"
        },
        {
          id: 2,
          descricao: "Carregando..."
        }
      ],
      skipDuplicates: true,
    });

    console.log({ store0, costCenter0, permissions, admin, statusAnalise })
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // close Prisma Client at the end
    await prisma.$disconnect();
  });