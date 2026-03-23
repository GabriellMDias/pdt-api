import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, runInTransaction } from '@/src/database/client';
import { LATEST_MIGRATION_VERSION, migrations } from '@/src/database/migrations/index';

const DB_LOG_PREFIX = '[mobile-db:migrator]';

let bootstrapPromise: Promise<void> | null = null;

async function readSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = Number(row?.user_version ?? 0);
  return Number.isFinite(version) ? version : 0;
}

async function writeSchemaVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

async function applyPendingMigrations(db: SQLiteDatabase): Promise<void> {
  let currentVersion = await readSchemaVersion(db);

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    console.log(
      `${DB_LOG_PREFIX} applying migration v${migration.version} (${migration.name})`,
    );

    await runInTransaction(db, async () => {
      await migration.up(db);
      await writeSchemaVersion(db, migration.version);
    });

    currentVersion = migration.version;

    console.log(
      `${DB_LOG_PREFIX} applied migration v${migration.version} (${migration.name})`,
    );
  }
}

export async function bootstrapDatabase(db?: SQLiteDatabase): Promise<void> {
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }

  bootstrapPromise = (async () => {
    const targetDb = db ?? (await getDatabase());

    try {
      await applyPendingMigrations(targetDb);

      const finalVersion = await readSchemaVersion(targetDb);
      if (finalVersion !== LATEST_MIGRATION_VERSION) {
        throw new Error(
          `Database schema version mismatch. Expected ${LATEST_MIGRATION_VERSION}, received ${finalVersion}.`,
        );
      }
    } catch (error) {
      console.error(`${DB_LOG_PREFIX} failed to bootstrap database`, error);
      throw error;
    }
  })();

  try {
    await bootstrapPromise;
  } catch (error) {
    bootstrapPromise = null;
    throw error;
  }
}

export async function getDatabaseSchemaVersion(db?: SQLiteDatabase): Promise<number> {
  const targetDb = db ?? (await getDatabase());
  return readSchemaVersion(targetDb);
}
