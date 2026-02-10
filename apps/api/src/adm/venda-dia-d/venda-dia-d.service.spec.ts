import { BadRequestException, ForbiddenException } from "@nestjs/common";
jest.mock(
  "src/db/prisma/prisma.service",
  () => ({ PrismaService: class PrismaService {} }),
  { virtual: true },
);
jest.mock(
  "src/db/pg/pg.service",
  () => ({ PgService: class PgService {} }),
  { virtual: true },
);
import { VendaDiaDService } from "./venda-dia-d.service";
import { VendaDiaDViewType } from "./dto/venda-dia-d.query.dto";

describe("VendaDiaDService", () => {
  const pg = {
    query: jest.fn(),
  };

  const prisma = {
    userPermission: {
      findMany: jest.fn(),
    },
  };

  const service = new VendaDiaDService(pg as any, prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executa consulta total quando viewType for total", async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ storeId: null }]);
    pg.query.mockResolvedValue({
      rows: [{ qtd_cupom: 10, qtd_cliente: 8, total_venda: 1000, total_desconto: 120 }],
    });

    const rows = await service.run(1, {
      storeId: [1, 5],
      initialDate: "2026-01-01",
      finalDate: "2026-01-31",
      viewType: VendaDiaDViewType.Total,
    });

    expect(rows).toHaveLength(1);
    expect(pg.query).toHaveBeenCalledTimes(1);
  });

  it("bloqueia lojas sem permissao", async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ storeId: 1 }]);

    await expect(
      service.run(7, {
        storeId: [1, 5],
        initialDate: "2026-01-01",
        finalDate: "2026-01-31",
        viewType: VendaDiaDViewType.Diario,
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
        viewType: VendaDiaDViewType.Periodo,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(pg.query).not.toHaveBeenCalled();
  });
});
