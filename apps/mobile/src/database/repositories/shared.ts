import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/src/database/client';
import { bootstrapDatabase } from '@/src/database/migrator';

export async function getReadyDatabase(): Promise<SQLiteDatabase> {
  const db = await getDatabase();
  await bootstrapDatabase(db);
  return db;
}
