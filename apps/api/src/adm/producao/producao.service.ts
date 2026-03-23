import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { PgService } from 'src/db/pg/pg.service';

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
  userId: number;
};

type QueryExecutor = Pick<PoolClient, 'query'> | PgService;

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
  product_id: number;
  active_status: boolean;
  yield_quantity: number | null;
};

type ProductionIngredientRow = {
  product_id: number;
  quantity_used: number | null;
  cost_with_tax_used: number | null;
  cost_without_tax_used: number | null;
  stock_quantity: number | null;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
};

type ProductionProductRow = {
  id: number;
  description: string;
  active_status: boolean;
  stock_quantity: number | null;
  cost_without_tax: number | null;
  cost_with_tax: number | null;
  average_cost_without_tax: number | null;
  average_cost_with_tax: number | null;
  credit_tax_id: number | null;
  debit_tax_id: number | null;
  pis_cofins_value: number | null;
};

@Injectable()
export class ProducaoService {
  constructor(private readonly pg: PgService) {}

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

    const [recipesResponse, outputsResponse, inputsResponse] = await Promise.all([
      client.query<ProductionRecipeHeaderRow>(recipesQuery, [storeId]),
      client.query<ProductionRecipeOutputCatalogRow>(outputsQuery, [storeId]),
      client.query<ProductionRecipeInputCatalogRow>(inputsQuery, [storeId]),
    ]);

    const outputsByRecipe = new Map<number, MobileProductionRecipeOutputItem[]>();
    for (const row of outputsResponse.rows) {
      const recipeId = Number(row.recipe_id);
      const items = outputsByRecipe.get(recipeId) ?? [];
      items.push({
        recipeOutputId: Number(row.recipe_output_id),
        productId: Number(row.product_id),
        yieldQuantity:
          row.yield_quantity != null && Number.isFinite(Number(row.yield_quantity))
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
          row.conversion_factor != null && Number.isFinite(Number(row.conversion_factor))
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
      throw new BadRequestException('Quantidade invalida para a producao.');
    }

    const recipeResponse = await client.query<ProductionRecipeRow>(
      `
        SELECT
          r.id,
          r.descricao AS description,
          rp.id_produto,
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

    if (Number(recipe.product_id) !== input.productId) {
      throw new BadRequestException(
        'Produto informado nao corresponde a receita enviada pelo mobile.',
      );
    }

    const producedProductResponse = await client.query<ProductionProductRow>(
      `
        SELECT
          p.id,
          p.descricaocompleta AS description,
          (pc.id_situacaocadastro = 1) AS active_status,
          pc.estoque AS stock_quantity,
          pc.custosemimposto AS cost_without_tax,
          pc.custocomimposto AS cost_with_tax,
          pc.customediosemimposto AS average_cost_without_tax,
          pc.customediocomimposto AS average_cost_with_tax,
          pa.id_aliquotacredito AS credit_tax_id,
          pa.id_aliquotadebito AS debit_tax_id,
          ((tpc.valorpis + tpc.valorcofins) * $3 * pc.custocomimposto / 100)::numeric(11,2) AS pis_cofins_value
        FROM produto p
        JOIN produtocomplemento pc
          ON pc.id_produto = p.id
         AND pc.id_loja = $2
        JOIN produtoaliquota pa
          ON pa.id_produto = p.id
        JOIN tipopiscofins tpc
          ON tpc.id = p.id_tipopiscofins
        WHERE p.id = $1
        LIMIT 1
      `,
      [input.productId, input.storeId, input.quantityInput],
    );
    const producedProduct = producedProductResponse.rows[0];

    if (!producedProduct || !producedProduct.active_status) {
      throw new NotFoundException(
        `Produto produzido ${input.productId} nao encontrado ou inativo para a loja ${input.storeId}.`,
      );
    }

    const recipeYield = Number(recipe.yield_quantity ?? 0);
    const normalizedRecipeYield =
      Number.isFinite(recipeYield) && recipeYield > 0 ? recipeYield : 1;

    const ingredientResponse = await client.query<ProductionIngredientRow>(
      `
        SELECT
          ri.id_produto AS product_id,
          (((ri.qtdembalagemreceita::numeric(12,3) / NULLIF(ri.qtdembalagemproduto::numeric(12,3), 0)) * $1) / $2)::numeric(12,3) AS quantity_used,
          ((pc.customediocomimposto * ((ri.qtdembalagemreceita::numeric(12,3) / NULLIF(ri.qtdembalagemproduto::numeric(12,3), 0)) * $1) / $2))::numeric(12,4) AS cost_with_tax_used,
          ((pc.customediosemimposto * ((ri.qtdembalagemreceita::numeric(12,3) / NULLIF(ri.qtdembalagemproduto::numeric(12,3), 0)) * $1) / $2))::numeric(12,4) AS cost_without_tax_used,
          pc.estoque AS stock_quantity,
          pc.custosemimposto AS cost_without_tax,
          pc.custocomimposto AS cost_with_tax,
          pc.customediosemimposto AS average_cost_without_tax,
          pc.customediocomimposto AS average_cost_with_tax
        FROM receitaitem ri
        JOIN produtocomplemento pc
          ON pc.id_produto = ri.id_produto
         AND pc.id_loja = $3
        WHERE ri.id_receita = $4
          AND ri.baixaestoque = true
      `,
      [input.quantityInput, normalizedRecipeYield, input.storeId, input.recipeId],
    );
    const ingredients = ingredientResponse.rows;

    let totalCostWithTax = 0;
    let totalCostWithoutTax = 0;

    for (const ingredient of ingredients) {
      const quantityUsed = Number(ingredient.quantity_used ?? 0);
      if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
        continue;
      }

      totalCostWithTax += Number(ingredient.cost_with_tax_used ?? 0);
      totalCostWithoutTax += Number(ingredient.cost_without_tax_used ?? 0);

      const currentStock = Number(ingredient.stock_quantity ?? 0);
      const nextStock = currentStock - quantityUsed;

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
            23,
            NOW(),
            $4,
            'PDT MOBILE PRODUCAO',
            $5,
            $6,
            1,
            $7,
            $8,
            CURRENT_DATE,
            $9,
            $10,
            NULL
          )
        `,
        [
          input.storeId,
          ingredient.product_id,
          quantityUsed,
          input.userId,
          currentStock,
          nextStock,
          ingredient.cost_without_tax != null ? Number(ingredient.cost_without_tax) : 0,
          ingredient.cost_with_tax != null ? Number(ingredient.cost_with_tax) : 0,
          ingredient.average_cost_with_tax != null ? Number(ingredient.average_cost_with_tax) : 0,
          ingredient.average_cost_without_tax != null ? Number(ingredient.average_cost_without_tax) : 0,
        ],
      );

      await client.query(
        `
          UPDATE produtocomplemento
          SET estoque = $3
          WHERE id_loja = $1
            AND id_produto = $2
        `,
        [input.storeId, ingredient.product_id, nextStock],
      );
    }

    const currentProducedStock = Number(producedProduct.stock_quantity ?? 0);
    const nextProducedStock = currentProducedStock + input.quantityInput;
    const unitCostWithTax =
      input.quantityInput > 0 ? Number((totalCostWithTax / input.quantityInput).toFixed(4)) : 0;
    const unitCostWithoutTax =
      input.quantityInput > 0 ? Number((totalCostWithoutTax / input.quantityInput).toFixed(4)) : 0;

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
          23,
          NOW(),
          $4,
          'PDT MOBILE PRODUCAO',
          $5,
          $6,
          0,
          $7,
          $8,
          CURRENT_DATE,
          $9,
          $10,
          NULL
        )
      `,
      [
        input.storeId,
        input.productId,
        input.quantityInput,
        input.userId,
        currentProducedStock,
        nextProducedStock,
        unitCostWithoutTax,
        unitCostWithTax,
        unitCostWithTax,
        unitCostWithoutTax,
      ],
    );

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
          85,
          0,
          'ALTERA ESTOQUE',
          NOW(),
          $3,
          CURRENT_DATE,
          '/MOBILE-SYNC',
          COALESCE((SELECT versao FROM versao WHERE id_programa = 0 LIMIT 1), 'MOBILE'),
          $2,
          ''
        )
      `,
      [input.storeId, input.productId, input.userId],
    );

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
        producedProduct.cost_with_tax != null ? Number(producedProduct.cost_with_tax) : 0,
        producedProduct.credit_tax_id,
        producedProduct.debit_tax_id,
        producedProduct.pis_cofins_value != null ? Number(producedProduct.pis_cofins_value) : 0,
        producedProduct.average_cost_with_tax != null
          ? Number(producedProduct.average_cost_with_tax)
          : 0,
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

    await client.query(
      `
        UPDATE produtocomplemento
        SET
          estoque = $3,
          custosemimposto = $4,
          custocomimposto = $5,
          customediosemimposto = $6,
          customediocomimposto = $7
        WHERE id_loja = $1
          AND id_produto = $2
      `,
      [
        input.storeId,
        input.productId,
        nextProducedStock,
        unitCostWithoutTax,
        unitCostWithTax,
        unitCostWithoutTax,
        unitCostWithTax,
      ],
    );

    return {
      recipeId: input.recipeId,
      productId: input.productId,
      description: producedProduct.description,
      quantityInput: input.quantityInput,
    };
  }
}
