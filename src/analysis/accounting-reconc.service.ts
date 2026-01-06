import { BadRequestException, Injectable } from "@nestjs/common";
import { PgService } from "src/db/pg/pg.service";
import { PrismaService } from "src/db/prisma/prisma.service";
import { AccountingReconcQueries } from "./queries";

@Injectable()
export class AccountingReconcService {
  constructor(
    private readonly pg: PgService,
    private readonly prisma: PrismaService
  ) {}

  private assertParams(
    storeIds: number[],
    date: string,
    analysisCode: string
  ) {
    if (!storeIds?.length) {
      throw new BadRequestException('Informe pelo menos uma loja.');
    }
    if (!date) {
      throw new BadRequestException('Parâmetro date é obrigatório.');
    }
    if (!analysisCode) {
      throw new BadRequestException('Parâmetro analysisCode é obrigatório.');
    }
  }

  public async aplicar(
    storeIds: number[],
    date: string,
    analysisCode: string,
    divergente = false
  ) {
    this.assertParams(storeIds, date, analysisCode);

    const sql = AccountingReconcQueries[analysisCode];

    if (!sql) {
      throw new BadRequestException(
        `Análise '${analysisCode}' não encontrada`
      );
    }

    const params = [
      date,
      storeIds,
      divergente
    ];

    const { rows } = await this.pg.query(sql, params);
    return rows;
  }
}
