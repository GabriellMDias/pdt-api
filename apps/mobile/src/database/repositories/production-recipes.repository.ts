import { runInTransaction } from '@/src/database/client';
import type {
  DatabaseExecutor,
  ProductionRecipeInputRow,
  ProductionRecipeOutputRow,
  ProductionRecipeRow,
  ProductionRecipeUpsertInput,
} from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function replaceProductionRecipesForStore(
  storeId: number,
  recipes: readonly ProductionRecipeUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  const persist = async () => {
    await executor.runAsync('DELETE FROM production_recipe_inputs WHERE store_id = ?', [storeId]);
    await executor.runAsync('DELETE FROM production_recipe_outputs WHERE store_id = ?', [storeId]);
    await executor.runAsync('DELETE FROM production_recipes WHERE store_id = ?', [storeId]);

    for (const recipe of recipes) {
      await executor.runAsync(
        `
          INSERT INTO production_recipes (
            id,
            store_id,
            description,
            active_status,
            synced_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          recipe.id,
          recipe.storeId,
          recipe.description,
          recipe.activeStatus ? 1 : 0,
          recipe.syncedAt,
          recipe.updatedAt,
        ],
      );

      for (const output of recipe.outputs) {
        await executor.runAsync(
          `
            INSERT INTO production_recipe_outputs (
              recipe_output_id,
              recipe_id,
              store_id,
              product_id,
              yield_quantity,
              synced_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            output.recipeOutputId,
            output.recipeId,
            output.storeId,
            output.productId,
            output.yieldQuantity,
            output.syncedAt,
            output.updatedAt,
          ],
        );
      }

      for (const input of recipe.inputs) {
        await executor.runAsync(
          `
            INSERT INTO production_recipe_inputs (
              recipe_input_id,
              recipe_id,
              store_id,
              product_id,
              recipe_package_quantity,
              product_package_quantity,
              deduct_stock,
              conversion_factor,
              synced_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            input.recipeInputId,
            input.recipeId,
            input.storeId,
            input.productId,
            input.recipePackageQuantity,
            input.productPackageQuantity,
            input.deductStock ? 1 : 0,
            input.conversionFactor,
            input.syncedAt,
            input.updatedAt,
          ],
        );
      }
    }
  };

  if (db) {
    await persist();
    return;
  }

  await runInTransaction(executor, persist);
}

export async function listProductionRecipesByStore(
  storeId: number,
  db?: DatabaseExecutor,
): Promise<ProductionRecipeRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<ProductionRecipeRow>(
    `
      SELECT *
      FROM production_recipes
      WHERE store_id = ?
        AND active_status = 1
      ORDER BY description COLLATE NOCASE ASC, id ASC
    `,
    [storeId],
  );
}

export async function listProductionRecipeOutputsByStore(
  storeId: number,
  db?: DatabaseExecutor,
): Promise<ProductionRecipeOutputRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<ProductionRecipeOutputRow>(
    `
      SELECT *
      FROM production_recipe_outputs
      WHERE store_id = ?
      ORDER BY recipe_id ASC, product_id ASC, recipe_output_id ASC
    `,
    [storeId],
  );
}

export async function listProductionRecipeInputsByStore(
  storeId: number,
  db?: DatabaseExecutor,
): Promise<ProductionRecipeInputRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<ProductionRecipeInputRow>(
    `
      SELECT *
      FROM production_recipe_inputs
      WHERE store_id = ?
      ORDER BY recipe_id ASC, product_id ASC, recipe_input_id ASC
    `,
    [storeId],
  );
}

export async function getProductionRecipeById(payload: {
  recipeId: number;
  storeId: number;
  db?: DatabaseExecutor;
}): Promise<ProductionRecipeRow | null> {
  const executor = await resolveExecutor(payload.db);
  return executor.getFirstAsync<ProductionRecipeRow>(
    `
      SELECT *
      FROM production_recipes
      WHERE id = ?
        AND store_id = ?
      LIMIT 1
    `,
    [payload.recipeId, payload.storeId],
  );
}

export async function hasProductionRecipeOutput(payload: {
  recipeId: number;
  storeId: number;
  productId: number;
  db?: DatabaseExecutor;
}): Promise<boolean> {
  const executor = await resolveExecutor(payload.db);
  const row = await executor.getFirstAsync<{ exists_flag: number }>(
    `
      SELECT 1 AS exists_flag
      FROM production_recipe_outputs
      WHERE recipe_id = ?
        AND store_id = ?
        AND product_id = ?
      LIMIT 1
    `,
    [payload.recipeId, payload.storeId, payload.productId],
  );

  return Number(row?.exists_flag ?? 0) === 1;
}
