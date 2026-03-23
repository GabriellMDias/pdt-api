import * as SQLite from 'expo-sqlite';
import type { DatabaseExecutor, TransactionMode } from '@/src/database/types';

const DATABASE_NAME = 'pdt-connect.db';
const DB_LOG_PREFIX = '[mobile-db]';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function configureDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await configureDatabase(db);
        return db;
      } catch (error) {
        console.error(`${DB_LOG_PREFIX} failed to open database`, error);
        databasePromise = null;
        throw error;
      }
    })();
  }

  return databasePromise;
}

function buildBeginStatement(mode: TransactionMode): string {
  switch (mode) {
    case 'deferred':
      return 'BEGIN DEFERRED TRANSACTION';
    case 'exclusive':
      return 'BEGIN EXCLUSIVE TRANSACTION';
    case 'immediate':
    default:
      return 'BEGIN IMMEDIATE TRANSACTION';
  }
}

export async function runInTransaction<T>(
  db: DatabaseExecutor,
  scope: () => Promise<T>,
  mode: TransactionMode = 'immediate',
): Promise<T> {
  await db.execAsync(buildBeginStatement(mode));

  try {
    const result = await scope();
    await db.execAsync('COMMIT');
    return result;
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK');
    } catch (rollbackError) {
      console.error(`${DB_LOG_PREFIX} transaction rollback failed`, rollbackError);
    }

    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!databasePromise) return;

  try {
    const db = await databasePromise;
    await db.closeAsync();
  } catch (error) {
    console.error(`${DB_LOG_PREFIX} failed to close database`, error);
  } finally {
    databasePromise = null;
  }
}
