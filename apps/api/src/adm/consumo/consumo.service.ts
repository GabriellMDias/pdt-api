import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { PgService } from "src/db/pg/pg.service";
import { StockMovementService } from "src/stock-movement/stock-movement.service";
import { TransactionLogService } from "src/stock-movement/transaction-log.service";

export type MobileConsumptionReasonItem = {
  id: number;
  description: string;
  activeStatus: boolean;
};

export type RegisterMobileConsumptionEntryInput = {
  storeId: number;
  productId: number;
  reasonId: number;
  signedQuantity: number;
  totalQuantity: number;
  quantityInput: number;
  packageCount: number;
  userId: number;
};

type QueryExecutor = Pick<PoolClient, "query"> | PgService;

type ConsumptionReasonRow = {
  id: number;
  descricao: string;
  emitenota: boolean | null;
};

type ConsumptionProductRow = {
  id: number;
  description: string;
  barcode: string | null;
  active_status: boolean;
  stock_quantity: number | null;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
  credit_tax_id: number | null;
  credit_pis_cofins_type_id: number | null;
  piscofins: number | null;
  ipi_value: number | null;
  icms_substitution_value: number | null;
  pis_cofins_base_value: number | null;
  pis_value: number | null;
  cofins_value: number | null;
};

@Injectable()
export class ConsumoService {
  constructor(
    private readonly pg: PgService,
    private readonly stockMovementService: StockMovementService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  async listReasonsForMobile(
    client: QueryExecutor = this.pg,
  ): Promise<MobileConsumptionReasonItem[]> {
    const query = `
      SELECT
        tc.id,
        tc.descricao AS description,
        case when tc.id_situacaocadastro = 1 then true else false end AS "activeStatus"
      FROM tipoconsumo tc
      ORDER BY tc.descricao ASC, tc.id ASC
    `;

    const response = await client.query<MobileConsumptionReasonItem>(query);
    return response.rows.map((row) => ({
      id: Number(row.id),
      description: row.description,
      activeStatus: Boolean(row.activeStatus),
    }));
  }

  async registerMobileEntry(
    input: RegisterMobileConsumptionEntryInput,
    client: QueryExecutor = this.pg,
  ): Promise<{
    productId: number;
    reasonId: number;
    description: string;
    signedQuantity: number;
  }> {
    if (!Number.isFinite(input.signedQuantity) || input.signedQuantity === 0) {
      throw new BadRequestException(
        "Quantidade assinada invalida para o consumo.",
      );
    }

    if (!Number.isFinite(input.totalQuantity) || input.totalQuantity <= 0) {
      throw new BadRequestException(
        "Quantidade total invalida para o consumo.",
      );
    }

    const reasonResponse = await client.query<ConsumptionReasonRow>(
      `
        SELECT
          id,
          descricao,
          COALESCE(emitenota, false) AS emitenota
        FROM tipoconsumo
        WHERE id = $1
        LIMIT 1
      `,
      [input.reasonId],
    );
    const reason = reasonResponse.rows[0];

    if (!reason) {
      throw new NotFoundException(
        `Tipo de consumo ${input.reasonId} nao encontrado para processamento mobile.`,
      );
    }

    const productResponse = await client.query<ConsumptionProductRow>(
      `
        SELECT
          p.id,
          p.descricaocompleta AS description,
          pa.codigobarras::text AS barcode,
          (pc.id_situacaocadastro = 1) AS active_status,
          pc.estoque AS stock_quantity,
          pc.custosemimposto AS cost_without_tax,
          pc.custocomimposto AS cost_with_tax,
          pc.customediosemimposto AS average_cost_without_tax,
          pc.customediocomimposto AS average_cost_with_tax,
          prod_aliq.id_aliquotacreditocusto AS credit_tax_id,
          p.id_tipopiscofinscredito AS credit_pis_cofins_type_id,
          (tpc.valorpis + tpc.valorcofins)::numeric(11,2) AS piscofins,
          pc.valoripi AS ipi_value,
          pc.valoricmssubstituicao AS icms_substitution_value,
          (
            pc.customediocomimposto -
            ((pc.customediocomimposto * a.porcentagemfinal) / 100) +
            pc.valoripi
          )::numeric(11,4) AS pis_cofins_base_value,
          (
            (
              tpc.valorpis * (
                pc.customediocomimposto -
                ((pc.customediocomimposto * a.porcentagemfinal) / 100) +
                pc.valoripi
              )
            ) / 100
          )::numeric(11,4) AS pis_value,
          (
            (
              tpc.valorcofins * (
                pc.customediocomimposto -
                ((pc.customediocomimposto * a.porcentagemfinal) / 100) +
                pc.valoripi
              )
            ) / 100
          )::numeric(11,4) AS cofins_value
        FROM produto p
        JOIN produtocomplemento pc
          ON pc.id_produto = p.id
         AND pc.id_loja = $2
        LEFT JOIN produtoautomacao pa
          ON pa.id_produto = p.id
        JOIN produtoaliquota prod_aliq
          ON prod_aliq.id_produto = p.id
        JOIN aliquota a
          ON a.id = prod_aliq.id_aliquotacreditocusto
        JOIN tipopiscofins tpc
          ON tpc.id = p.id_tipopiscofinscredito
        WHERE p.id = $1
        ORDER BY pa.codigobarras NULLS LAST
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

    const movementType = input.signedQuantity > 0 ? "add" : "remove";
    const absoluteQuantity = Math.abs(input.signedQuantity);
    await this.stockMovementService.applyMovement(
      {
        storeId: input.storeId,
        originalProductId: input.productId,
        userId: input.userId,
        movementTypeId: 11,
        quantity: absoluteQuantity,
        stockEntryType: movementType === "add" ? 1 : 0,
        updateCost: false,
        stockObservation: "PDT MOBILE CONSUMO",
      },
      client,
    );

    await this.transactionLogService.register(
      {
        storeId: input.storeId,
        productId: input.productId,
        formId: 9,
        transactionTypeId: 1,
        userId: input.userId,
        ipTerminal: "MOBILE-SYNC",
      },
      client,
    );

    const existingConsumption = await client.query<{ quantity: number | null }>(
      `
        SELECT quantidade AS quantity
        FROM consumo
        WHERE id_loja = $1
          AND id_produto = $2
          AND data = CURRENT_DATE
          AND id_tipoconsumo = $3
        LIMIT 1
      `,
      [input.storeId, input.productId, input.reasonId],
    );
    const currentConsumption = Number(
      existingConsumption.rows[0]?.quantity ?? 0,
    );
    const nextConsumption = currentConsumption + input.signedQuantity;

    if (existingConsumption.rows.length > 0) {
      await client.query(
        `
          UPDATE consumo
          SET
            quantidade = $4,
            custocomimposto = $5,
            custosemimposto = $6,
            id_aliquotacredito = $7,
            piscofins = $8,
            id_tipopiscofins = $9,
            customediocomimposto = $10,
            customediosemimposto = $11,
            valoripi = $12,
            valoricmssubstituicao = $13,
            valorbasepiscofins = $14,
            valorpis = $15,
            valorcofins = $16,
            emitenota = $17
          WHERE id_loja = $1
            AND id_produto = $2
            AND data = CURRENT_DATE
            AND id_tipoconsumo = $3
        `,
        [
          input.storeId,
          input.productId,
          input.reasonId,
          nextConsumption,
          product.cost_with_tax != null ? Number(product.cost_with_tax) : 0,
          product.cost_without_tax != null
            ? Number(product.cost_without_tax)
            : 0,
          product.credit_tax_id,
          product.piscofins != null ? Number(product.piscofins) : 0,
          product.credit_pis_cofins_type_id,
          product.average_cost_with_tax != null
            ? Number(product.average_cost_with_tax)
            : 0,
          product.average_cost_without_tax != null
            ? Number(product.average_cost_without_tax)
            : 0,
          product.ipi_value != null ? Number(product.ipi_value) : 0,
          product.icms_substitution_value != null
            ? Number(product.icms_substitution_value)
            : 0,
          product.pis_cofins_base_value != null
            ? Number(product.pis_cofins_base_value)
            : 0,
          product.pis_value != null ? Number(product.pis_value) : 0,
          product.cofins_value != null ? Number(product.cofins_value) : 0,
          Boolean(reason.emitenota),
        ],
      );
    } else {
      await client.query(
        `
          INSERT INTO consumo (
            id_loja,
            id_produto,
            data,
            id_tipoconsumo,
            quantidade,
            custocomimposto,
            custosemimposto,
            id_aliquotacredito,
            piscofins,
            id_tipopiscofins,
            observacao,
            customediocomimposto,
            customediosemimposto,
            valoripi,
            valoricmssubstituicao,
            id_notasaida,
            valorbasepiscofins,
            valorpis,
            valorcofins,
            emitenota
          )
          VALUES (
            $1,
            $2,
            CURRENT_DATE,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            '',
            $10,
            $11,
            $12,
            $13,
            NULL,
            $14,
            $15,
            $16,
            $17
          )
        `,
        [
          input.storeId,
          input.productId,
          input.reasonId,
          input.signedQuantity,
          product.cost_with_tax != null ? Number(product.cost_with_tax) : 0,
          product.cost_without_tax != null
            ? Number(product.cost_without_tax)
            : 0,
          product.credit_tax_id,
          product.piscofins != null ? Number(product.piscofins) : 0,
          product.credit_pis_cofins_type_id,
          product.average_cost_with_tax != null
            ? Number(product.average_cost_with_tax)
            : 0,
          product.average_cost_without_tax != null
            ? Number(product.average_cost_without_tax)
            : 0,
          product.ipi_value != null ? Number(product.ipi_value) : 0,
          product.icms_substitution_value != null
            ? Number(product.icms_substitution_value)
            : 0,
          product.pis_cofins_base_value != null
            ? Number(product.pis_cofins_base_value)
            : 0,
          product.pis_value != null ? Number(product.pis_value) : 0,
          product.cofins_value != null ? Number(product.cofins_value) : 0,
          Boolean(reason.emitenota),
        ],
      );
    }

    return {
      productId: input.productId,
      reasonId: input.reasonId,
      description: product.description,
      signedQuantity: input.signedQuantity,
    };
  }
}
