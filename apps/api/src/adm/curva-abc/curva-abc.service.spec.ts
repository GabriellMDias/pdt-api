import { BadRequestException, ForbiddenException } from "@nestjs/common";
jest.mock(
  "src/db/prisma/prisma.service",
  () => ({ PrismaService: class PrismaService {} }),
  { virtual: true },
);
jest.mock("src/db/pg/pg.service", () => ({ PgService: class PgService {} }), {
  virtual: true,
});
import { CurvaAbcService } from "./curva-abc.service";

describe("CurvaAbcService", () => {
  const pg = {
    query: jest.fn(),
  };

  const prisma = {
    userPermission: {
      findMany: jest.fn(),
    },
  };

  const service = new CurvaAbcService(pg as any, prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executa a consulta com filtros parametrizados", async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ storeId: null }]);
    pg.query.mockResolvedValue({
      rows: [
        {
          id_produto: 10,
          descricao: "Produto A",
          quantidade: 12,
          venda: 100.45,
          lucro: 20.33,
          mercadologico1: 1,
          mercadologico1_descricao: "Mer 1",
          mercadologico2: 2,
          mercadologico2_descricao: "Mer 2",
        },
      ],
    });

    const rows = await service.run(1, {
      storeId: [1, 5, 1],
      initialDate: "2026-01-01",
      finalDate: "2026-01-31",
      mercadologico1: 10,
      mercadologico2: 20,
    });

    expect(rows).toHaveLength(1);
    expect(pg.query).toHaveBeenCalledTimes(1);
    expect(pg.query).toHaveBeenCalledWith(
      expect.stringContaining("produto.mercadologico1 = $4::int"),
      ["2026-01-01", "2026-01-31", [1, 5], 10, 20],
    );
  });

  it("envia filtros mercadologicos como null quando omitidos", async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ storeId: null }]);
    pg.query.mockResolvedValue({ rows: [] });

    await service.run(1, {
      storeId: [3],
      initialDate: "2026-02-01",
      finalDate: "2026-02-28",
    });

    expect(pg.query).toHaveBeenCalledWith(expect.any(String), [
      "2026-02-01",
      "2026-02-28",
      [3],
      null,
      null,
    ]);
  });

  it("bloqueia lojas sem permissao", async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ storeId: 1 }]);

    await expect(
      service.run(7, {
        storeId: [1, 5],
        initialDate: "2026-01-01",
        finalDate: "2026-01-31",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("valida intervalo de data", async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ storeId: null }]);

    await expect(
      service.run(3, {
        storeId: [1],
        initialDate: "2026-01-31",
        finalDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(pg.query).not.toHaveBeenCalled();
  });
});
