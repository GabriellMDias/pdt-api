import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductAssociationResolverService } from "./product-association-resolver.service";
import { StockFreezeResolverService } from "./stock-freeze-resolver.service";
import {
  AppliedCostUpdate,
  QueryExecutor,
  StockMovementInput,
  StockMovementResult,
  StockProductSnapshot,
} from "./stock-movement.types";
import { calculateAverageCost } from "./stock-movement-formulas";

type ProductSnapshotRow = {
  product_id: number;
  active_status: boolean;
  stock_quantity: number | null;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
};

@Injectable()
export class StockMovementService {
  constructor(
    private readonly stockFreezeResolver: StockFreezeResolverService,
    private readonly associationResolver: ProductAssociationResolverService,
  ) {}

  async applyMovement(
    input: StockMovementInput,
    client: QueryExecutor,
  ): Promise<StockMovementResult> {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new Error("Quantidade invalida para movimentacao de estoque.");
    }

    const stockAssociation =
      await this.associationResolver.resolveStockMovement(
        input.originalProductId,
        input.quantity,
        client,
      );

    const stockProductId =
      stockAssociation?.resolvedProductId ?? input.originalProductId;
    const movedQuantity =
      stockAssociation?.resolvedQuantity ?? Number(input.quantity.toFixed(3));

    const stockTarget = await this.getProductSnapshot(
      input.storeId,
      stockProductId,
      client,
    );

    let baseCostUpdate: AppliedCostUpdate | null = null;
    let propagatedCostUpdates: AppliedCostUpdate[] = [];

    if (input.updateCost) {
      if (!input.costs) {
        throw new Error(
          "Movimentacao configurada para atualizar custo exige valores de custo.",
        );
      }

      const baseCostSnapshot = await this.getProductSnapshot(
        input.storeId,
        input.originalProductId,
        client,
      );

      baseCostUpdate = await this.applyCostUpdate(
        {
          storeId: input.storeId,
          productSnapshot: baseCostSnapshot,
          codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
          costWithoutTax: input.costs.costWithoutTax,
          costWithTax: input.costs.costWithTax,
          quantity: input.quantity,
          costObservation: input.costObservation ?? "",
          propagatedFromProductId: null,
        },
        client,
      );

      propagatedCostUpdates = await this.applyAssociatedCostUpdates(
        input,
        baseCostUpdate,
        client,
      );
    }

    const stockFrozen = await this.stockFreezeResolver.isStockFrozen(
      input.storeId,
      client,
    );

    if (stockTarget.activeStatus) {
      if (stockFrozen) {
        await this.insertFrozenStock(
          {
            storeId: input.storeId,
            productId: stockProductId,
            movementTypeId: input.movementTypeId,
            quantity: movedQuantity,
            stockEntryType: input.stockEntryType,
            frozenFlags: input.frozenStockFlags,
          },
          client,
        );
      } else {
        await this.insertStockLogAndUpdate(
          {
            storeId: input.storeId,
            productId: stockProductId,
            quantity: movedQuantity,
            movementTypeId: input.movementTypeId,
            codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
            stockBefore: stockTarget.stockQuantity,
            stockEntryType: input.stockEntryType,
            costWithoutTax: stockTarget.costWithoutTax,
            costWithTax: stockTarget.costWithTax,
            averageCostWithoutTax: stockTarget.averageCostWithoutTax,
            averageCostWithTax: stockTarget.averageCostWithTax,
            observation: input.stockObservation ?? "",
          },
          client,
        );
      }
    }

    const stockAfter = stockTarget.activeStatus
      ? this.calculateNextStock(
          stockTarget.stockQuantity,
          movedQuantity,
          input.stockEntryType,
        )
      : null;

    return {
      originalProductId: input.originalProductId,
      stockProductId,
      requestedQuantity: input.quantity,
      movedQuantity,
      stockFrozen,
      stockApplied: stockTarget.activeStatus && !stockFrozen,
      stockTargetActive: stockTarget.activeStatus,
      stockBefore: stockTarget.stockQuantity,
      stockAfter: stockFrozen ? null : stockAfter,
      stockAssociation,
      baseCostUpdate,
      propagatedCostUpdates,
    };
  }

  async applyMovements(
    inputs: readonly StockMovementInput[],
    client: QueryExecutor,
  ): Promise<StockMovementResult[]> {
    const results: StockMovementResult[] = [];
    for (const input of inputs) {
      results.push(await this.applyMovement(input, client));
    }
    return results;
  }

  private async applyAssociatedCostUpdates(
    input: StockMovementInput,
    baseCostUpdate: AppliedCostUpdate,
    client: QueryExecutor,
  ): Promise<AppliedCostUpdate[]> {
    const rules = await this.associationResolver.listCostAssociations(
      input.originalProductId,
      client,
    );

    const updates: AppliedCostUpdate[] = [];
    for (const rule of rules) {
      if (rule.targetProductId === input.originalProductId) {
        continue;
      }

      const targetSnapshot = await this.getProductSnapshot(
        input.storeId,
        rule.targetProductId,
        client,
      );

      if (!targetSnapshot.activeStatus) {
        continue;
      }

      const propagated = await this.applyCostUpdate(
        {
          storeId: input.storeId,
          productSnapshot: targetSnapshot,
          codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
          costWithoutTax: this.associationResolver.calculatePropagatedCost(
            rule,
            baseCostUpdate.nextCostWithoutTax,
          ),
          costWithTax: this.associationResolver.calculatePropagatedCost(
            rule,
            baseCostUpdate.nextCostWithTax,
          ),
          quantity: input.quantity,
          costObservation:
            input.costObservation ??
            `ASSOCIADO CUSTO ${input.originalProductId}`,
          propagatedFromProductId: input.originalProductId,
          averageCostWithoutTax:
            this.associationResolver.calculatePropagatedCost(
              rule,
              baseCostUpdate.nextAverageCostWithoutTax,
            ),
          averageCostWithTax: this.associationResolver.calculatePropagatedCost(
            rule,
            baseCostUpdate.nextAverageCostWithTax,
          ),
        },
        client,
      );

      updates.push(propagated);
    }

    return updates;
  }

  private async applyCostUpdate(
    payload: {
      storeId: number;
      productSnapshot: StockProductSnapshot;
      codigoUsuarioVrMaster: number;
      costWithoutTax: number;
      costWithTax: number;
      quantity: number;
      costObservation: string;
      propagatedFromProductId: number | null;
      averageCostWithoutTax?: number;
      averageCostWithTax?: number;
    },
    client: QueryExecutor,
  ): Promise<AppliedCostUpdate> {
    const nextAverageCostWithoutTax =
      payload.averageCostWithoutTax ??
      calculateAverageCost({
        actualStock: payload.productSnapshot.stockQuantity,
        actualAverageCost: payload.productSnapshot.averageCostWithoutTax,
        quantityToEnter: payload.quantity,
        costToEnter: payload.costWithoutTax,
      });
    const nextAverageCostWithTax =
      payload.averageCostWithTax ??
      calculateAverageCost({
        actualStock: payload.productSnapshot.stockQuantity,
        actualAverageCost: payload.productSnapshot.averageCostWithTax,
        quantityToEnter: payload.quantity,
        costToEnter: payload.costWithTax,
      });

    const update: AppliedCostUpdate = {
      productId: payload.productSnapshot.productId,
      previousCostWithoutTax: payload.productSnapshot.costWithoutTax,
      nextCostWithoutTax: payload.costWithoutTax,
      previousCostWithTax: payload.productSnapshot.costWithTax,
      nextCostWithTax: payload.costWithTax,
      previousAverageCostWithoutTax:
        payload.productSnapshot.averageCostWithoutTax,
      nextAverageCostWithoutTax,
      previousAverageCostWithTax: payload.productSnapshot.averageCostWithTax,
      nextAverageCostWithTax,
      propagatedFromProductId: payload.propagatedFromProductId,
    };

    await client.query(
      `
        INSERT INTO logcusto (
          id_produto,
          custosemimpostoanterior,
          custosemimposto,
          custocomimpostoanterior,
          custocomimposto,
          datahora,
          id_usuario,
          id_loja,
          datamovimento,
          observacao,
          customediosemimposto,
          customediocomimposto,
          customediocomimpostoanterior,
          customediosemimpostoanterior,
          valoripi,
          valoricmssubstituicao,
          valoricms,
          valorpiscofins,
          valoracrescimo,
          valoracrescimoimposto,
          custonota,
          percentualperda,
          valordesconto,
          valordescontoimposto,
          valorbonificacao,
          valorverba,
          valoroutrassubstituicao,
          valordespesafrete,
          valorfcp,
          valorfcpsubstituicao
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW(),
          $6,
          $7,
          CURRENT_DATE,
          $8,
          $9,
          $10,
          $11,
          $12,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        )
      `,
      [
        update.productId,
        update.previousCostWithoutTax,
        update.nextCostWithoutTax,
        update.previousCostWithTax,
        update.nextCostWithTax,
        payload.codigoUsuarioVrMaster,
        payload.storeId,
        payload.costObservation,
        update.nextAverageCostWithoutTax,
        update.nextAverageCostWithTax,
        update.previousAverageCostWithTax,
        update.previousAverageCostWithoutTax,
      ],
    );

    await client.query(
      `
        UPDATE produtocomplemento
        SET
          custosemimposto = $3,
          custocomimposto = $4,
          custosemimpostoanterior = $5,
          custocomimpostoanterior = $6,
          customediosemimposto = $7,
          customediocomimposto = $8,
          customediosemimpostoanterior = $9,
          customediocomimpostoanterior = $10
        WHERE id_loja = $1
          AND id_produto = $2
      `,
      [
        payload.storeId,
        update.productId,
        update.nextCostWithoutTax,
        update.nextCostWithTax,
        update.previousCostWithoutTax,
        update.previousCostWithTax,
        update.nextAverageCostWithoutTax,
        update.nextAverageCostWithTax,
        update.previousAverageCostWithoutTax,
        update.previousAverageCostWithTax,
      ],
    );

    return update;
  }

  private async insertFrozenStock(
    payload: {
      storeId: number;
      productId: number;
      movementTypeId: number;
      quantity: number;
      stockEntryType: number;
      frozenFlags?: StockMovementInput["frozenStockFlags"];
    },
    client: QueryExecutor,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO estoquecongelado (
          id_produto,
          id_loja,
          id_tipomovimentacao,
          quantidade,
          baixareceita,
          baixaassociado,
          baixaperda,
          observacao,
          custocomimposto,
          customediocomimposto,
          custosemimposto,
          customediosemimposto,
          data,
          id_estoquecongeladotipoentradasaida,
          id_venda
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          '',
          0,
          0,
          0,
          0,
          CURRENT_DATE,
          $8,
          NULL
        )
      `,
      [
        payload.productId,
        payload.storeId,
        payload.movementTypeId,
        payload.quantity,
        payload.frozenFlags?.baixaReceita ?? false,
        payload.frozenFlags?.baixaAssociado ?? true,
        payload.frozenFlags?.baixaPerda ?? false,
        payload.stockEntryType,
      ],
    );
  }

  private async insertStockLogAndUpdate(
    payload: {
      storeId: number;
      productId: number;
      quantity: number;
      movementTypeId: number;
      codigoUsuarioVrMaster: number;
      stockBefore: number;
      stockEntryType: number;
      costWithoutTax: number;
      costWithTax: number;
      averageCostWithoutTax: number;
      averageCostWithTax: number;
      observation: string;
    },
    client: QueryExecutor,
  ): Promise<void> {
    const stockAfter = this.calculateNextStock(
      payload.stockBefore,
      payload.quantity,
      payload.stockEntryType,
    );

    await client.query(
      `
        INSERT INTO logestoque (
          id_loja,
          id_produto,
          quantidade,
          id_tipomovimentacao,
          datahora,
          id_usuario,
          observacao,
          estoqueanterior,
          estoqueatual,
          id_tipoentradasaida,
          custosemimposto,
          custocomimposto,
          datamovimento,
          customediocomimposto,
          customediosemimposto,
          id_venda
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          NOW(),
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          CURRENT_DATE,
          $12,
          $13,
          NULL
        )
      `,
      [
        payload.storeId,
        payload.productId,
        payload.quantity,
        payload.movementTypeId,
        payload.codigoUsuarioVrMaster,
        payload.observation,
        payload.stockBefore,
        stockAfter,
        payload.stockEntryType,
        payload.costWithoutTax,
        payload.costWithTax,
        payload.averageCostWithTax,
        payload.averageCostWithoutTax,
      ],
    );

    await client.query(
      `
        UPDATE produtocomplemento
        SET estoque = $3
        WHERE id_loja = $1
          AND id_produto = $2
      `,
      [payload.storeId, payload.productId, stockAfter],
    );
  }

  private calculateNextStock(
    currentStock: number,
    quantity: number,
    stockEntryType: number,
  ): number {
    return stockEntryType === 1
      ? Number((currentStock - quantity).toFixed(3))
      : Number((currentStock + quantity).toFixed(3));
  }

  private async getProductSnapshot(
    storeId: number,
    productId: number,
    client: QueryExecutor,
  ): Promise<StockProductSnapshot> {
    const response = await client.query<ProductSnapshotRow>(
      `
        SELECT
          pc.id_produto AS product_id,
          (pc.id_situacaocadastro = 1) AS active_status,
          pc.estoque AS stock_quantity,
          pc.custosemimposto AS cost_without_tax,
          pc.custocomimposto AS cost_with_tax,
          pc.customediosemimposto AS average_cost_without_tax,
          pc.customediocomimposto AS average_cost_with_tax
        FROM produtocomplemento pc
        WHERE pc.id_loja = $1
          AND pc.id_produto = $2
        LIMIT 1
      `,
      [storeId, productId],
    );

    const row = response.rows[0];
    if (!row) {
      throw new NotFoundException(
        `Produto ${productId} nao encontrado para a loja ${storeId}.`,
      );
    }

    return {
      productId: Number(row.product_id),
      activeStatus: Boolean(row.active_status),
      stockQuantity: Number(row.stock_quantity ?? 0),
      costWithoutTax: Number(row.cost_without_tax ?? 0),
      costWithTax: Number(row.cost_with_tax ?? 0),
      averageCostWithoutTax: Number(row.average_cost_without_tax ?? 0),
      averageCostWithTax: Number(row.average_cost_with_tax ?? 0),
    };
  }
}
