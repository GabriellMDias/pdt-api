import { Injectable } from "@nestjs/common";
import {
  calculateAssociatedCostValue,
  calculateAssociatedStockQuantity,
} from "./stock-movement-formulas";
import {
  CostAssociationRule,
  QueryExecutor,
  StockAssociationResolution,
} from "./stock-movement.types";

type AssociationRow = {
  primary_package_quantity: number | null;
  associated_product_id: number;
  associated_package_quantity: number | null;
  percentage: number | null;
};

@Injectable()
export class ProductAssociationResolverService {
  async resolveStockMovement(
    originalProductId: number,
    requestedQuantity: number,
    client: QueryExecutor,
  ): Promise<StockAssociationResolution | null> {
    const response = await client.query<AssociationRow>(
      `
        SELECT
          ass.qtdembalagem AS primary_package_quantity,
          ai.id_produto AS associated_product_id,
          ai.qtdembalagem AS associated_package_quantity,
          ai.percentualcustoestoque AS percentage
        FROM associadoitem ai
        JOIN associado ass
          ON ass.id = ai.id_associado
        WHERE ass.id_produto = $1
          AND ai.aplicaestoque = true
        ORDER BY ai.id ASC
        LIMIT 1
      `,
      [originalProductId],
    );

    const row = response.rows[0];
    if (!row) {
      return null;
    }

    const primaryPackageQuantity = Number(row.primary_package_quantity ?? 0);
    const associatedPackageQuantity = Number(
      row.associated_package_quantity ?? 0,
    );
    const percentage = Number(row.percentage ?? 0);
    const resolvedQuantity = calculateAssociatedStockQuantity({
      requestedQuantity,
      primaryPackageQuantity,
      associatedPackageQuantity,
      percentage,
    });

    return {
      originalProductId,
      resolvedProductId: Number(row.associated_product_id),
      requestedQuantity,
      resolvedQuantity,
      primaryPackageQuantity,
      associatedPackageQuantity,
      percentage,
    };
  }

  async listCostAssociations(
    sourceProductId: number,
    client: QueryExecutor,
  ): Promise<CostAssociationRule[]> {
    const response = await client.query<AssociationRow>(
      `
        SELECT
          ass.qtdembalagem AS primary_package_quantity,
          ai.id_produto AS associated_product_id,
          ai.qtdembalagem AS associated_package_quantity,
          ai.percentualcustoestoque AS percentage
        FROM associadoitem ai
        JOIN associado ass
          ON ass.id = ai.id_associado
        WHERE ass.id_produto = $1
          AND ai.aplicacusto = true
        ORDER BY ai.id ASC
      `,
      [sourceProductId],
    );

    return response.rows.map((row) => ({
      sourceProductId,
      targetProductId: Number(row.associated_product_id),
      primaryPackageQuantity: Number(row.primary_package_quantity ?? 0),
      associatedPackageQuantity: Number(row.associated_package_quantity ?? 0),
      percentage: Number(row.percentage ?? 0),
    }));
  }

  calculatePropagatedCost(rule: CostAssociationRule, baseCost: number): number {
    return calculateAssociatedCostValue({
      baseCost,
      primaryPackageQuantity: rule.primaryPackageQuantity,
      associatedPackageQuantity: rule.associatedPackageQuantity,
      percentage: rule.percentage,
    });
  }
}
