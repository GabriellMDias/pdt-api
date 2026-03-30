import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { PgService } from "src/db/pg/pg.service";
import { StockMovementService } from "src/stock-movement/stock-movement.service";
import { TransactionLogService } from "src/stock-movement/transaction-log.service";

export type MobileExchangeReasonItem = {
  id: number;
  description: string;
  activeStatus: boolean;
};

export type MobileStockCatalogItem = {
  id: number;
  barcode: string | null;
  description: string;
  packageQuantity: number | null;
  packagingTypeId: number | null;
  packagingDescription: string | null;
  shelfCode: string | null;
  activeStatus: boolean;
  decimalAllowed: boolean;
  salePrice: number | null;
  stockQuantity: number | null;
  exchangeQuantity: number | null;
  averageCostWithTax: number | null;
  grossWeight: number | null;
};

export type RegisterMobileExchangeEntryInput = {
  storeId: number;
  productId: number;
  reasonId: number;
  signedQuantity: number;
  totalQuantity: number;
  quantityInput: number;
  packageCount: number;
  codigoUsuarioVrMaster: number;
};

type QueryExecutor = Pick<PoolClient, "query"> | PgService;

type ExchangeProductRow = {
  id: number;
  description: string;
  barcode: string | null;
  active_status: boolean;
  stock_quantity: number | null;
  exchange_quantity: number | null;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
};

@Injectable()
export class TrocaService {
  constructor(
    private readonly pg: PgService,
    private readonly stockMovementService: StockMovementService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  async listReasonsForMobile(
    client: QueryExecutor = this.pg,
  ): Promise<MobileExchangeReasonItem[]> {
    const query = `
      SELECT
        tmt.id,
        tmt.descricao AS description,
        CASE WHEN id_situacaocadastro = 1 THEN true ELSE false END AS "activeStatus"
      FROM tipomotivotroca tmt
      ORDER BY tmt.descricao ASC, tmt.id ASC
    `;

    const response = await client.query<MobileExchangeReasonItem>(query);
    return response.rows.map((row) => ({
      id: Number(row.id),
      description: row.description,
      activeStatus: Boolean(row.activeStatus),
    }));
  }

  async listProductsForMobile(
    storeId: number,
    client: QueryExecutor = this.pg,
  ): Promise<MobileStockCatalogItem[]> {
    const query = `
      SELECT DISTINCT ON (p.id)
        p.id,
        pa.codigobarras::text AS barcode,
        p.descricaocompleta AS description,
        pa.qtdembalagem AS "packageQuantity",
        COALESCE(p.id_tipoembalagem, pa.id_tipoembalagem) AS "packagingTypeId",
        te.descricao AS "packagingDescription",
        pc.prateleira AS "shelfCode",
        (pc.id_situacaocadastro = 1) AS "activeStatus",
        (COALESCE(p.id_tipoembalagem, pa.id_tipoembalagem) IN (4, 6, 9)) AS "decimalAllowed",
        pc.precovenda AS "salePrice",
        pc.estoque AS "stockQuantity",
        pc.troca AS "exchangeQuantity",
        pc.customediocomimposto AS "averageCostWithTax",
        p.pesobruto AS "grossWeight"
      FROM produto p
      JOIN produtocomplemento pc
        ON pc.id_produto = p.id
       AND pc.id_loja = $1
      LEFT JOIN produtoautomacao pa
        ON pa.id_produto = p.id
      LEFT JOIN tipoembalagem te
        ON te.id = COALESCE(p.id_tipoembalagem, pa.id_tipoembalagem)
      ORDER BY p.id, pa.codigobarras NULLS LAST
    `;

    const response = await client.query<MobileStockCatalogItem>(query, [
      storeId,
    ]);
    return response.rows.map((row) => ({
      id: Number(row.id),
      barcode: row.barcode ?? null,
      description: row.description,
      packageQuantity:
        row.packageQuantity != null ? Number(row.packageQuantity) : null,
      packagingTypeId:
        row.packagingTypeId != null ? Number(row.packagingTypeId) : null,
      packagingDescription: row.packagingDescription ?? null,
      shelfCode: row.shelfCode ?? null,
      activeStatus: Boolean(row.activeStatus),
      decimalAllowed: Boolean(row.decimalAllowed),
      salePrice: row.salePrice != null ? Number(row.salePrice) : null,
      stockQuantity:
        row.stockQuantity != null ? Number(row.stockQuantity) : null,
      exchangeQuantity:
        row.exchangeQuantity != null ? Number(row.exchangeQuantity) : null,
      averageCostWithTax:
        row.averageCostWithTax != null ? Number(row.averageCostWithTax) : null,
      grossWeight: row.grossWeight != null ? Number(row.grossWeight) : null,
    }));
  }

  async registerMobileEntry(
    input: RegisterMobileExchangeEntryInput,
    client: QueryExecutor = this.pg,
  ): Promise<{
    productId: number;
    reasonId: number;
    description: string;
    signedQuantity: number;
  }> {
    if (!Number.isFinite(input.signedQuantity) || input.signedQuantity === 0) {
      throw new BadRequestException(
        "Quantidade assinada invalida para a troca.",
      );
    }

    if (!Number.isFinite(input.totalQuantity) || input.totalQuantity <= 0) {
      throw new BadRequestException("Quantidade total invalida para a troca.");
    }

    const reasonQuery = `
      SELECT id, descricao
      FROM tipomotivotroca
      WHERE id = $1
      LIMIT 1
    `;
    const reasonResponse = await client.query<{
      id: number;
      descricao: string;
    }>(reasonQuery, [input.reasonId]);
    const reason = reasonResponse.rows[0];

    if (!reason) {
      throw new NotFoundException(
        `Motivo de troca ${input.reasonId} nao encontrado para processamento mobile.`,
      );
    }

    const productQuery = `
      SELECT
        p.id,
        p.descricaocompleta AS description,
        pa.codigobarras::text AS barcode,
        (pc.id_situacaocadastro = 1) AS active_status,
        pc.estoque AS stock_quantity,
        pc.troca AS exchange_quantity,
        pc.custosemimposto AS cost_without_tax,
        pc.custocomimposto AS cost_with_tax,
        pc.customediosemimposto AS average_cost_without_tax,
        pc.customediocomimposto AS average_cost_with_tax
      FROM produto p
      JOIN produtocomplemento pc
        ON pc.id_produto = p.id
       AND pc.id_loja = $2
      LEFT JOIN produtoautomacao pa
        ON pa.id_produto = p.id
      WHERE p.id = $1
      ORDER BY pa.codigobarras NULLS LAST
      LIMIT 1
    `;

    const productResponse = await client.query<ExchangeProductRow>(
      productQuery,
      [input.productId, input.storeId],
    );
    const product = productResponse.rows[0];

    if (!product || !product.active_status) {
      throw new NotFoundException(
        `Produto ${input.productId} nao encontrado ou inativo para a loja ${input.storeId}.`,
      );
    }

    const movementType = input.signedQuantity > 0 ? "add" : "remove";
    const absoluteQuantity = Math.abs(input.signedQuantity);
    const currentExchange = Number(product.exchange_quantity ?? 0);
    const nextExchange = currentExchange + input.signedQuantity;

    await this.stockMovementService.applyMovement(
      {
        storeId: input.storeId,
        originalProductId: input.productId,
        codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
        movementTypeId: 18,
        quantity: absoluteQuantity,
        stockEntryType: movementType === "add" ? 1 : 0,
        updateCost: false,
        stockObservation: "PDT MOBILE TROCA",
      },
      client,
    );

    await client.query(
      `
        INSERT INTO logtroca (
          id_loja,
          id_produto,
          quantidade,
          datahora,
          id_usuario,
          estoqueanterior,
          estoqueatual,
          id_tipoentradasaida,
          datamovimento,
          id_motivotroca,
          observacaotroca,
          custosemimposto,
          custocomimposto,
          customediosemimposto,
          customediocomimposto
        )
        VALUES (
          $1,
          $2,
          $3,
          NOW(),
          $4,
          $5,
          $6,
          $7,
          CURRENT_DATE,
          $8,
          'PDT MOBILE TROCA',
          $9,
          $10,
          $11,
          $12
        )
      `,
      [
        input.storeId,
        input.productId,
        absoluteQuantity,
        input.codigoUsuarioVrMaster,
        currentExchange,
        nextExchange,
        movementType === "add" ? 0 : 1,
        input.reasonId,
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

    await this.transactionLogService.register(
      {
        storeId: input.storeId,
        productId: input.productId,
        formId: 196,
        transactionTypeId: 1,
        codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
        ipTerminal: "MOBILE-SYNC",
      },
      client,
    );

    await client.query(
      `
        UPDATE produtocomplemento
        SET troca = $3
        WHERE id_loja = $1
          AND id_produto = $2
      `,
      [input.storeId, input.productId, nextExchange],
    );

    return {
      productId: input.productId,
      reasonId: input.reasonId,
      description: product.description,
      signedQuantity: input.signedQuantity,
    };
  }
}
