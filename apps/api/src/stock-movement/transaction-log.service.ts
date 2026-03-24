import { Injectable } from "@nestjs/common";
import { LogTransactionInput, QueryExecutor } from "./stock-movement.types";

@Injectable()
export class TransactionLogService {
  async register(
    input: LogTransactionInput,
    client: QueryExecutor,
  ): Promise<void> {
    const ipTerminal = this.normalizeIpTerminal(input.ipTerminal);
    const referenceId = input.referenceId ?? input.productId;

    await client.query(
      `
        INSERT INTO logtransacao (
          id_loja,
          referencia,
          id_formulario,
          id_tipotransacao,
          observacao,
          datahora,
          id_usuario,
          datamovimento,
          ipterminal,
          versao,
          id_referencia,
          alteracao
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW(),
          $6,
          CURRENT_DATE,
          $7,
          COALESCE((SELECT versao FROM versao WHERE id_programa = 0 LIMIT 1), 'MOBILE'),
          $8,
          $9
        )
      `,
      [
        input.storeId,
        input.productId,
        input.formId,
        input.transactionTypeId,
        input.observation ?? "",
        input.userId,
        ipTerminal,
        referenceId,
        input.alteracao ?? "",
      ],
    );
  }

  private normalizeIpTerminal(value?: string | null): string {
    const terminal = (value ?? "MOBILE-SYNC").trim().replace(/^\/+/, "");
    return `/${terminal || "MOBILE-SYNC"}`;
  }
}
