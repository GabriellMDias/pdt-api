import { Injectable } from "@nestjs/common";
import { QueryExecutor } from "./stock-movement.types";

@Injectable()
export class StockFreezeResolverService {
  async isStockFrozen(
    storeId: number,
    client: QueryExecutor,
  ): Promise<boolean> {
    const response = await client.query<{ value: boolean | null }>(
      `
        SELECT COALESCE(pv.valor::boolean, false) AS value
        FROM parametrovalor pv
        JOIN parametro p
          ON p.id = pv.id_parametro
        WHERE p.descricao = 'Estoque Congelado'
          AND pv.id_loja = $1
        LIMIT 1
      `,
      [storeId],
    );

    return Boolean(response.rows[0]?.value ?? false);
  }
}
