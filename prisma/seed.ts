import { PrismaClient } from "@prisma/client";
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roundsOfHashing = 10;

async function main() {
    const store0 = await prisma.store.upsert({
      where: {id: 0},
      update: {},
      create: {
        id: 0,
        storeName: 'Sem loja',
        description: 'Sem Loja',
        activeStatus: true
      }
    })

    const costCenter0 = await prisma.costCenter.upsert({
      where: {id: 0},
      update: {},
      create: {
        id: 0,
        description: "Sem Centro Custo"
      }
    })


    console.log({store0, costCenter0, })
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