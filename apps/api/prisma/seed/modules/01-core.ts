import { prisma } from "../helpers";
import * as bcrypt from "bcrypt";

export default async function seedCore() {
  const rounds = +(process.env.BCRYPT_ROUNDS ?? "10");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-now";

  const hashedPassword = await bcrypt.hash(adminPassword, rounds);

  // ATENÇÃO: se 'id' for autoincrement no schema, evite fixar 0.
  // Prefira um campo único estável p/ upsert (ex.: code/email).
  const store0 = await prisma.store.upsert({
    where: { id: 0 },
    update: {},
    create: {
      id: 0,
      storeName: "Sem loja",
      description: "Sem Loja",
      activeStatus: true,
      cnpj: ""
    }
  });

  const costCenter0 = await prisma.costCenter.upsert({
    where: { id: 0 },
    update: {},
    create: {
      id: 0,
      description: "Sem Centro Custo",
      activeStatus: true
    }
  });

  const admin = await prisma.user.upsert({
    where: { id: 0 },
    update: {
      activeStatus: true,
    },
    create: {
      id: 0,
      name: "Administrador",
      email: "admin@admin.com",
      password: hashedPassword,
      activeStatus: true,
    }
  });

  const expenseType0 = await prisma.expenseType.upsert({
    where: {id: 0},
    update: {},
    create: {
      id: 0,
      description: "Sem Tipo",
      isActived: true,
    }
  })

  const expenseType1 = await prisma.expenseType.upsert({
    where: {id: 1},
    update: {},
    create: {
      id: 1,
      description: "Despesa com Pessoal",
      isActived: true,
    }
  })

  console.log({ store0: store0.id, costCenter0: costCenter0.id, admin: admin.id, expenseType0: expenseType0.id, expenseType1: expenseType1.id });
}
