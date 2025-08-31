import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  Pool,
  PoolClient,
  QueryResult,
  QueryArrayResult,
  QueryResultRow,
  QueryConfig,
  QueryArrayConfig,
  QueryConfigValues,
  Submittable,
  types,
} from 'pg';

// Parsers (mantidos iguais)
types.setTypeParser(1700, (val: string) => parseFloat(val)); // NUMERIC
types.setTypeParser(23, (val: string) => parseInt(val, 10)); // INTEGER
types.setTypeParser(20, (val: string) => parseInt(val, 10)); // BIGINT

@Injectable()
export class PgService implements OnModuleDestroy, OnModuleInit {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.PG_DATABASE_USER,
      host: process.env.PG_DATABASE_HOST,
      database: process.env.PG_DATABASE_DATABASE,
      password: process.env.PG_DATABASE_PASSWORD,
      port: parseInt(process.env.PG_DATABASE_PORT || '3333', 10),
      application_name: process.env.PG_APPLICATION_NAME,
    });
  }

  async onModuleInit() {
    const c = await this.pool.connect();
    c.release();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  // ================= Back-compat: overloads iguais ao Client =================
  query<T extends Submittable>(queryStream: T): T;
  // Array mode
  query<R extends any[] = any[], I = any[]>(
    queryConfig: QueryArrayConfig<I>,
    values?: QueryConfigValues<I>,
  ): Promise<QueryArrayResult<R>>;
  // Config object
  query<R extends QueryResultRow = any, I = any>(
    queryConfig: QueryConfig<I>,
  ): Promise<QueryResult<R>>;
  // Text or config + values (Promise)
  query<R extends QueryResultRow = any, I = any[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: QueryConfigValues<I>,
  ): Promise<QueryResult<R>>;
  // Callbacks (se houver algum call-site assim no seu projeto)
  query<R extends any[] = any[], I = any[]>(
    queryConfig: QueryArrayConfig<I>,
    callback: (err: Error, result: QueryArrayResult<R>) => void,
  ): void;
  query<R extends QueryResultRow = any, I = any[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    callback: (err: Error, result: QueryResult<R>) => void,
  ): void;
  query<R extends QueryResultRow = any, I = any[]>(
    queryText: string,
    values: QueryConfigValues<I>,
    callback: (err: Error, result: QueryResult<R>) => void,
  ): void;

  // Implementação única que delega para o pool
  query(queryTextOrConfig: any, valuesOrCallback?: any, maybeCallback?: any): any {
    return (this.pool as any).query(queryTextOrConfig, valuesOrCallback, maybeCallback);
  }
  // =========================================================================

  /**
   * Usa um client dedicado do pool durante o callback.
   * Útil para ajustes de sessão (SET, search_path) ou múltiplas queries.
   */
  async withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      return await fn(c);
    } finally {
      c.release();
    }
  }

  /**
   * Executa um bloco transacional com BEGIN/COMMIT/ROLLBACK.
   * O callback recebe o PoolClient da transação.
   */
  async transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (c) => {
      await c.query('BEGIN');
      try {
        const result = await fn(c);
        await c.query('COMMIT');
        return result;
      } catch (e) {
        try { await c.query('ROLLBACK'); } catch {}
        throw e;
      }
    });
  }
}
