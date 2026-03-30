import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { PgService } from 'src/db/pg/pg.service';
import { TransactionLogService } from 'src/stock-movement/transaction-log.service';

export type MobileBalanceHeaderItem = {
  id: number;
  description: string;
  stockLabel: string;
  statusCode: number;
};

export type RegisterMobileBalanceEntryInput = {
  storeId: number;
  balanceId: number;
  productId: number;
  signedQuantity: number;
  totalQuantity: number;
  quantityInput: number;
  packageCount: number;
  codigoUsuarioVrMaster: number;
};

type QueryExecutor = Pick<PoolClient, 'query'> | PgService;

type BalanceHeaderRow = {
  id: number;
  description: string;
  stock_label: string;
  status_code: number;
};

type BalanceProductRow = {
  id: number;
  description: string;
  active_status: boolean;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
};

@Injectable()
export class BalancoService {
  constructor(
    private readonly pg: PgService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  async listHeadersForMobile(
    storeId: number,
    client: QueryExecutor = this.pg,
  ): Promise<MobileBalanceHeaderItem[]> {
    const query = `
      SELECT
        b.id,
        b.descricao AS description,
        teb.descricao AS stock_label,
        b.id_situacaobalanco AS status_code
      FROM balanco b
      JOIN tipoestoquebalanco teb
        ON teb.id = b.id_tipoestoquebalanco
      WHERE b.id_loja = $1
      ORDER BY
        CASE
          WHEN b.id_situacaobalanco = 0 THEN 0
          ELSE 1
        END ASC,
        b.descricao ASC,
        b.id ASC
    `;

    const response = await client.query<BalanceHeaderRow>(query, [storeId]);
    return response.rows.map((row) => ({
      id: Number(row.id),
      description: row.description,
      stockLabel: row.stock_label,
      statusCode: Number(row.status_code),
    }));
  }

  async registerMobileEntry(
    input: RegisterMobileBalanceEntryInput,
    client: QueryExecutor = this.pg,
  ): Promise<{
    balanceId: number;
    productId: number;
    description: string;
    signedQuantity: number;
  }> {
    if (!Number.isFinite(input.signedQuantity) || input.signedQuantity === 0) {
      throw new BadRequestException('Quantidade assinada invalida para o balanco.');
    }

    if (!Number.isFinite(input.totalQuantity) || input.totalQuantity <= 0) {
      throw new BadRequestException('Quantidade total invalida para o balanco.');
    }

    const balanceResponse = await client.query<BalanceHeaderRow>(
      `
        SELECT
          b.id,
          b.descricao AS description,
          teb.descricao AS stock_label,
          b.id_situacaobalanco AS status_code
        FROM balanco b
        JOIN tipoestoquebalanco teb
          ON teb.id = b.id_tipoestoquebalanco
        WHERE b.id = $1
          AND b.id_loja = $2
        LIMIT 1
      `,
      [input.balanceId, input.storeId],
    );
    const balance = balanceResponse.rows[0];

    if (!balance) {
      throw new NotFoundException(
        `Balanco ${input.balanceId} nao encontrado para a loja ${input.storeId}.`,
      );
    }

    if (Number(balance.status_code) === 1) {
      throw new BadRequestException(`Balanco ${input.balanceId} ja foi finalizado.`);
    }

    if (Number(balance.status_code) !== 0) {
      throw new BadRequestException(`Balanco ${input.balanceId} nao esta disponivel para lancamento.`);
    }

    const productResponse = await client.query<BalanceProductRow>(
      `
        SELECT
          p.id,
          p.descricaocompleta AS description,
          (pc.id_situacaocadastro = 1) AS active_status,
          pc.custosemimposto AS cost_without_tax,
          pc.custocomimposto AS cost_with_tax,
          pc.customediosemimposto AS average_cost_without_tax,
          pc.customediocomimposto AS average_cost_with_tax
        FROM produto p
        JOIN produtocomplemento pc
          ON pc.id_produto = p.id
         AND pc.id_loja = $2
        WHERE p.id = $1
        LIMIT 1
      `,
      [input.productId, input.storeId],
    );
    const product = productResponse.rows[0];

    if (!product || !product.active_status) {
      throw new NotFoundException(
        `Produto ${input.productId} nao encontrado ou inativo para a loja ${input.storeId}.`,
      );
    }

    const previousBalanceResponse = await client.query<{ quantity: number | null }>(
      `
        SELECT quantidade AS quantity
        FROM balancoestoque
        WHERE id_balanco = $1
          AND id_produto = $2
        LIMIT 1
      `,
      [input.balanceId, input.productId],
    );
    const previousQuantity = Number(previousBalanceResponse.rows[0]?.quantity ?? 0);
    const nextQuantity = previousQuantity + input.signedQuantity;

    await this.transactionLogService.register(
      {
        storeId: input.storeId,
        productId: input.productId,
        formId: 61,
        transactionTypeId: 2,
        codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
        ipTerminal: 'MOBILE-SYNC',
      },
      client,
    );

    if (previousBalanceResponse.rows.length > 0) {
      await client.query(
        `
          UPDATE balancoestoque
          SET
            id_loja = $3,
            quantidade = $4,
            custosemimposto = $5,
            custocomimposto = $6,
            id_tipobalancoestoque = 0,
            customediosemimposto = $7,
            customediocomimposto = $8
          WHERE id_balanco = $1
            AND id_produto = $2
        `,
        [
          input.balanceId,
          input.productId,
          input.storeId,
          nextQuantity,
          product.cost_without_tax != null ? Number(product.cost_without_tax) : 0,
          product.cost_with_tax != null ? Number(product.cost_with_tax) : 0,
          product.average_cost_without_tax != null
            ? Number(product.average_cost_without_tax)
            : 0,
          product.average_cost_with_tax != null
            ? Number(product.average_cost_with_tax)
            : 0,
        ],
      );
    } else {
      await client.query(
        `
          INSERT INTO balancoestoque (
            id_loja,
            id_balanco,
            id_produto,
            quantidade,
            custosemimposto,
            custocomimposto,
            id_tipobalancoestoque,
            customediocomimposto,
            customediosemimposto,
            quantidaderecontagem,
            quantidadeconferencia,
            posicaoestoquecongelamento
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            0,
            $7,
            $8,
            NULL,
            NULL,
            NULL
          )
        `,
        [
          input.storeId,
          input.balanceId,
          input.productId,
          input.signedQuantity,
          product.cost_without_tax != null ? Number(product.cost_without_tax) : 0,
          product.cost_with_tax != null ? Number(product.cost_with_tax) : 0,
          product.average_cost_with_tax != null
            ? Number(product.average_cost_with_tax)
            : 0,
          product.average_cost_without_tax != null
            ? Number(product.average_cost_without_tax)
            : 0,
        ],
      );
    }

    return {
      balanceId: input.balanceId,
      productId: input.productId,
      description: product.description,
      signedQuantity: input.signedQuantity,
    };
  }
}
