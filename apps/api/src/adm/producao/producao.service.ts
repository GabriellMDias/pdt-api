import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { PgService } from "src/db/pg/pg.service";
import { calculateCostWithoutTaxFromProducedProductTaxes } from "src/stock-movement/stock-movement-formulas";
import { StockMovementService } from "src/stock-movement/stock-movement.service";
import { TransactionLogService } from "src/stock-movement/transaction-log.service";
import { AppliedCostUpdate } from "src/stock-movement/stock-movement.types";

export type MobileProductionRecipeOutputItem = {
  recipeOutputId: number;
  productId: number;
  yieldQuantity: number | null;
};

export type MobileProductionRecipeInputItem = {
  recipeInputId: number;
  productId: number;
  recipePackageQuantity: number | null;
  productPackageQuantity: number | null;
  deductStock: boolean;
  conversionFactor: number | null;
};

export type MobileProductionRecipeItem = {
  id: number;
  description: string;
  activeStatus: boolean;
  outputs: MobileProductionRecipeOutputItem[];
  inputs: MobileProductionRecipeInputItem[];
};

export type RegisterMobileProductionEntryInput = {
  storeId: number;
  recipeId: number;
  productId: number;
  quantityInput: number;
  codigoUsuarioVrMaster: number;
};

type QueryExecutor = Pick<PoolClient, "query"> | PgService;

type ProductionRecipeHeaderRow = {
  id: number;
  description: string;
  active_status: boolean;
};

type ProductionRecipeOutputCatalogRow = {
  recipe_id: number;
  recipe_output_id: number;
  product_id: number;
  yield_quantity: number | null;
};

type ProductionRecipeInputCatalogRow = {
  recipe_id: number;
  recipe_input_id: number;
  product_id: number;
  recipe_package_quantity: number | null;
  product_package_quantity: number | null;
  deduct_stock: boolean;
  conversion_factor: number | null;
};

type ProductionRecipeRow = {
  id: number;
  description: string;
  product_id?: number | null;
  id_produto?: number | null;
  active_status: boolean;
  yield_quantity: number | null;
};

type ProductionIngredientRow = {
  product_id: number;
  quantity_used: number | null;
  cost_with_tax_used: number | null;
};

type ProductionProductRow = {
  id: number;
  description: string;
  active_status: boolean;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
  credit_tax_id: number | null;
  debit_tax_id: number | null;
  pis_cofins_rate: number | null;
  consumer_tax_rate: number | null;
};

@Injectable()
export class ProducaoService {
  constructor(
    private readonly pg: PgService,
    private readonly stockMovementService: StockMovementService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  async listRecipesForMobile(
    storeId: number,
    client: QueryExecutor = this.pg,
  ): Promise<MobileProductionRecipeItem[]> {
    const recipesQuery = `
      SELECT DISTINCT
        r.id,
        r.descricao AS description,
        CASE WHEN r.id_situacaocadastro = 1 THEN true ELSE false END AS active_status
      FROM receita r
      JOIN receitaloja rl
        ON rl.id_receita = r.id
      WHERE rl.id_loja = $1
        AND r.id_situacaocadastro = 1
        AND EXISTS (
          SELECT 1
          FROM receitaproduto rp_active
          JOIN produtocomplemento pc_active
            ON pc_active.id_produto = rp_active.id_produto
           AND pc_active.id_loja = $1
           AND pc_active.id_situacaocadastro = 1
          WHERE rp_active.id_receita = r.id
        )
      ORDER BY r.descricao ASC, r.id ASC
    `;
    const outputsQuery = `
      SELECT DISTINCT
        r.id AS recipe_id,
        rp.id AS recipe_output_id,
        rp.id_produto AS product_id,
        rp.rendimento AS yield_quantity
      FROM receita r
      JOIN receitaproduto rp
        ON rp.id_receita = r.id
      JOIN produtocomplemento pc
        ON pc.id_produto = rp.id_produto
       AND pc.id_loja = $1
       AND pc.id_situacaocadastro = 1
      JOIN receitaloja rl
        ON rl.id_receita = r.id
      WHERE rl.id_loja = $1
        AND r.id_situacaocadastro = 1
      ORDER BY r.id ASC, rp.id_produto ASC, rp.id ASC
    `;
    const inputsQuery = `
      SELECT DISTINCT
        r.id AS recipe_id,
        ri.id AS recipe_input_id,
        ri.id_produto AS product_id,
        ri.qtdembalagemreceita AS recipe_package_quantity,
        ri.qtdembalagemproduto AS product_package_quantity,
        ri.baixaestoque AS deduct_stock,
        ri.fatorconversao AS conversion_factor
      FROM receita r
      JOIN receitaitem ri
        ON ri.id_receita = r.id
      JOIN receitaloja rl
        ON rl.id_receita = r.id
      WHERE rl.id_loja = $1
        AND r.id_situacaocadastro = 1
        AND EXISTS (
          SELECT 1
          FROM receitaproduto rp_active
          JOIN produtocomplemento pc_active
            ON pc_active.id_produto = rp_active.id_produto
           AND pc_active.id_loja = $1
           AND pc_active.id_situacaocadastro = 1
          WHERE rp_active.id_receita = r.id
        )
      ORDER BY r.id ASC, ri.id_produto ASC, ri.id ASC
    `;

    const [recipesResponse, outputsResponse, inputsResponse] =
      await Promise.all([
        client.query<ProductionRecipeHeaderRow>(recipesQuery, [storeId]),
        client.query<ProductionRecipeOutputCatalogRow>(outputsQuery, [storeId]),
        client.query<ProductionRecipeInputCatalogRow>(inputsQuery, [storeId]),
      ]);

    const outputsByRecipe = new Map<
      number,
      MobileProductionRecipeOutputItem[]
    >();
    for (const row of outputsResponse.rows) {
      const recipeId = Number(row.recipe_id);
      const items = outputsByRecipe.get(recipeId) ?? [];
      items.push({
        recipeOutputId: Number(row.recipe_output_id),
        productId: Number(row.product_id),
        yieldQuantity:
          row.yield_quantity != null &&
          Number.isFinite(Number(row.yield_quantity))
            ? Number(row.yield_quantity)
            : null,
      });
      outputsByRecipe.set(recipeId, items);
    }

    const inputsByRecipe = new Map<number, MobileProductionRecipeInputItem[]>();
    for (const row of inputsResponse.rows) {
      const recipeId = Number(row.recipe_id);
      const items = inputsByRecipe.get(recipeId) ?? [];
      items.push({
        recipeInputId: Number(row.recipe_input_id),
        productId: Number(row.product_id),
        recipePackageQuantity:
          row.recipe_package_quantity != null &&
          Number.isFinite(Number(row.recipe_package_quantity))
            ? Number(row.recipe_package_quantity)
            : null,
        productPackageQuantity:
          row.product_package_quantity != null &&
          Number.isFinite(Number(row.product_package_quantity))
            ? Number(row.product_package_quantity)
            : null,
        deductStock: Boolean(row.deduct_stock),
        conversionFactor:
          row.conversion_factor != null &&
          Number.isFinite(Number(row.conversion_factor))
            ? Number(row.conversion_factor)
            : null,
      });
      inputsByRecipe.set(recipeId, items);
    }

    return recipesResponse.rows.map((row) => {
      const recipeId = Number(row.id);
      return {
        id: recipeId,
        description: row.description,
        activeStatus: Boolean(row.active_status),
        outputs: outputsByRecipe.get(recipeId) ?? [],
        inputs: inputsByRecipe.get(recipeId) ?? [],
      };
    });
  }

  async registerMobileEntry(
    input: RegisterMobileProductionEntryInput,
    client: QueryExecutor = this.pg,
  ): Promise<{
    recipeId: number;
    productId: number;
    description: string;
    quantityInput: number;
  }> {
    if (!Number.isFinite(input.quantityInput) || input.quantityInput <= 0) {
      throw new BadRequestException("Quantidade invalida para a producao.");
    }

    const recipeResponse = await client.query<ProductionRecipeRow>(
      `
        SELECT
          r.id,
          r.descricao AS description,
          rp.id_produto AS product_id,
          (r.id_situacaocadastro = 1) AS active_status,
          rp.rendimento AS yield_quantity
        FROM receita r
        JOIN receitaproduto rp
          ON rp.id_receita = r.id
         AND rp.id_produto = $3
        JOIN receitaloja rl
          ON rl.id_receita = r.id
         AND rl.id_loja = $2
        WHERE r.id = $1
        LIMIT 1
      `,
      [input.recipeId, input.storeId, input.productId],
    );
    const recipe = recipeResponse.rows[0];

    if (!recipe || !recipe.active_status) {
      throw new NotFoundException(
        `Receita ${input.recipeId} nao encontrada ou inativa para a loja ${input.storeId}.`,
      );
    }

    const recipeProductId = Number(recipe.product_id ?? recipe.id_produto ?? NaN);

    if (!Number.isInteger(recipeProductId) || recipeProductId !== input.productId) {
      throw new BadRequestException(
        "Produto informado nao corresponde a receita enviada pelo mobile.",
      );
    }

    const producedProductResponse = await client.query<ProductionProductRow>(
      `
        SELECT
          p.id,
          p.descricaocompleta AS description,
          (pc.id_situacaocadastro = 1) AS active_status,
          pc.custosemimposto AS cost_without_tax,
          pc.custocomimposto AS cost_with_tax,
          pc.customediosemimposto AS average_cost_without_tax,
          pc.customediocomimposto AS average_cost_with_tax,
          pa.id_aliquotacredito AS credit_tax_id,
          pa.id_aliquotadebito AS debit_tax_id,
          (tpc.valorpis + tpc.valorcofins)::numeric(11,2) AS pis_cofins_rate,
          a_consumidor.porcentagemfinal::numeric(11,2) AS consumer_tax_rate
        FROM produto p
        JOIN produtocomplemento pc
          ON pc.id_produto = p.id
         AND pc.id_loja = $2
        JOIN produtoaliquota pa
          ON pa.id_produto = p.id
        LEFT JOIN aliquota a_consumidor
          ON a_consumidor.id = pa.id_aliquotaconsumidor
        LEFT JOIN tipopiscofins tpc
          ON tpc.id = p.id_tipopiscofins
        WHERE p.id = $1
        LIMIT 1
      `,
      [input.productId, input.storeId],
    );
    const producedProduct = producedProductResponse.rows[0];

    if (!producedProduct || !producedProduct.active_status) {
      throw new NotFoundException(
        `Produto produzido ${input.productId} nao encontrado ou inativo para a loja ${input.storeId}.`,
      );
    }

    const producedProductPisCofinsRate = this.getRequiredTaxRate(
      producedProduct.pis_cofins_rate,
      "tipopiscofins.valorpis + valorcofins",
      input.productId,
    );
    const producedProductConsumerTaxRate = this.getRequiredTaxRate(
      producedProduct.consumer_tax_rate,
      "aliquota.porcentagemfinal (id_aliquotaconsumidor)",
      input.productId,
    );

    const recipeYield = Number(recipe.yield_quantity ?? 0);
    const normalizedRecipeYield =
      Number.isFinite(recipeYield) && recipeYield > 0 ? recipeYield : 1;

    const ingredientResponse = await client.query<ProductionIngredientRow>(
      `
        SELECT
          ri.id_produto AS product_id,
          (((ri.qtdembalagemreceita::numeric(12,3) / NULLIF(ri.qtdembalagemproduto::numeric(12,3), 0)) * $1) / $2)::numeric(12,3) AS quantity_used,
          ((pc.customediocomimposto * ((ri.qtdembalagemreceita::numeric(12,3) / NULLIF(ri.qtdembalagemproduto::numeric(12,3), 0)) * $1) / $2))::numeric(12,4) AS cost_with_tax_used
        FROM receitaitem ri
        JOIN produtocomplemento pc
          ON pc.id_produto = ri.id_produto
         AND pc.id_loja = $3
        WHERE ri.id_receita = $4
          AND ri.baixaestoque = true
      `,
      [
        input.quantityInput,
        normalizedRecipeYield,
        input.storeId,
        input.recipeId,
      ],
    );
    const ingredients = ingredientResponse.rows;

    let totalCostWithTax = 0;

    for (const ingredient of ingredients) {
      const quantityUsed = Number(ingredient.quantity_used ?? 0);
      if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
        continue;
      }

      totalCostWithTax += Number(ingredient.cost_with_tax_used ?? 0);

      await this.stockMovementService.applyMovement(
        {
          storeId: input.storeId,
          originalProductId: Number(ingredient.product_id),
          codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
          movementTypeId: 23,
          quantity: quantityUsed,
          stockEntryType: 1,
          updateCost: false,
          stockObservation: "PDT MOBILE PRODUCAO",
        },
        client,
      );
    }

    const unitCostWithTax =
      input.quantityInput > 0
        ? Number((totalCostWithTax / input.quantityInput).toFixed(4))
        : 0;
    const unitCostWithoutTax = this.calculateProducedCostWithoutTax({
      unitCostWithTax,
      pisCofinsRate: producedProductPisCofinsRate,
      consumerTaxRate: producedProductConsumerTaxRate,
      productId: input.productId,
    });

    const producedMovement = await this.stockMovementService.applyMovement(
      {
        storeId: input.storeId,
        originalProductId: input.productId,
        codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
        movementTypeId: 23,
        quantity: input.quantityInput,
        stockEntryType: 0,
        updateCost: true,
        costs: {
          costWithoutTax: unitCostWithoutTax,
          costWithTax: unitCostWithTax,
        },
        stockObservation: "PDT MOBILE PRODUCAO",
        costObservation: "PRODUCAO 0",
      },
      client,
    );

    await this.transactionLogService.register(
      {
        storeId: input.storeId,
        productId: input.productId,
        formId: 85,
        transactionTypeId: 0,
        codigoUsuarioVrMaster: input.codigoUsuarioVrMaster,
        ipTerminal: "MOBILE-SYNC",
      },
      client,
    );

    const appliedCost =
      producedMovement.baseCostUpdate ??
      this.buildFallbackCostUpdate(producedProduct);

    const productionInsert = await client.query<{ id: number }>(
      `
        INSERT INTO producao (
          id_loja,
          data,
          id_produto,
          quantidade,
          custocomimposto,
          id_aliquotacredito,
          id_aliquotadebito,
          piscofins,
          customediocomimposto
        )
        VALUES (
          $1,
          CURRENT_DATE,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING id
      `,
      [
        input.storeId,
        input.productId,
        input.quantityInput,
        appliedCost.nextCostWithTax,
        producedProduct.credit_tax_id,
        producedProduct.debit_tax_id,
        (Number(producedProduct.pis_cofins_rate ?? 0) *
          input.quantityInput *
          appliedCost.nextCostWithTax) /
          100,
        appliedCost.nextAverageCostWithTax,
      ],
    );

    const productionId = Number(productionInsert.rows[0]?.id ?? 0);

    if (productionId > 0) {
      await client.query(
        `
          INSERT INTO producaoitem (
            id_producao,
            id_produto,
            qtdembalagemproducao,
            qtdembalagemproduto
          )
          SELECT
            $1,
            ri.id_produto,
            ri.qtdembalagemreceita,
            ri.qtdembalagemproduto
          FROM receitaitem ri
          WHERE ri.id_receita = $2
            AND ri.baixaestoque = true
        `,
        [productionId, input.recipeId],
      );
    }
    return {
      recipeId: input.recipeId,
      productId: input.productId,
      description: producedProduct.description,
      quantityInput: input.quantityInput,
    };
  }

  private buildFallbackCostUpdate(
    product: ProductionProductRow,
  ): AppliedCostUpdate {
    const costWithoutTax = Number(product.cost_without_tax ?? 0);
    const costWithTax = Number(product.cost_with_tax ?? 0);
    const averageCostWithoutTax = Number(product.average_cost_without_tax ?? 0);
    const averageCostWithTax = Number(product.average_cost_with_tax ?? 0);

    return {
      productId: Number(product.id),
      previousCostWithoutTax: costWithoutTax,
      nextCostWithoutTax: costWithoutTax,
      previousCostWithTax: costWithTax,
      nextCostWithTax: costWithTax,
      previousAverageCostWithoutTax: averageCostWithoutTax,
      nextAverageCostWithoutTax: averageCostWithoutTax,
      previousAverageCostWithTax: averageCostWithTax,
      nextAverageCostWithTax: averageCostWithTax,
      propagatedFromProductId: null,
    };
  }

  private getRequiredTaxRate(
    value: number | null,
    sourceDescription: string,
    productId: number,
  ): number {
    if (value == null || !Number.isFinite(Number(value))) {
      throw new BadRequestException(
        `Produto produzido ${productId} nao possui configuracao tributaria valida em ${sourceDescription}.`,
      );
    }

    return Number(value);
  }

  private calculateProducedCostWithoutTax(payload: {
    unitCostWithTax: number;
    pisCofinsRate: number;
    consumerTaxRate: number;
    productId: number;
  }): number {
    try {
      return calculateCostWithoutTaxFromProducedProductTaxes({
        costWithTax: payload.unitCostWithTax,
        pisCofinsRate: payload.pisCofinsRate,
        consumerTaxRate: payload.consumerTaxRate,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao calcular custosemimposto da producao.";
      throw new BadRequestException(
        `Nao foi possivel calcular custosemimposto do produto produzido ${payload.productId}: ${message}`,
      );
    }
  }
}
