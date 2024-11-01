import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, types } from 'pg'

// pg parser config
types.setTypeParser(1700, (val: string) => parseFloat(val)) // NUMERIC
types.setTypeParser(23, (val: string) => parseInt(val, 10)); //INTEGER
types.setTypeParser(20, (val: string) => parseInt(val, 10)); //INTEGER

@Injectable()
export class PgService extends Client implements OnModuleInit, OnModuleDestroy {
    constructor(){
        super({
            user: process.env.PG_DATABASE_USER,
            host: process.env.PG_DATABASE_HOST,
            database: process.env.PG_DATABASE_DATABASE,
            password: process.env.PG_DATABASE_PASSWORD,
            port: parseInt(process.env.PG_DATABASE_PORT || "3333"),
            application_name: process.env.PG_APPLICATION_NAME,
        })
    }

    /**
     * Executes a transaction, ensuring that all operations are committed or rolled back as a single atomic action.
     *
     * @template T - The expected return type from the transaction callback.
     * @param callback - A function containing the database operations to be performed in the transaction.
     *                   It receives a `PgService` client for query execution.
     * @returns {Promise<T>} - The result of the transaction if successful.
     * 
     * @example
     * async processTransactionExample() {
     *   return this.pg.transaction(async (client) => {
     *     // First operation in the transaction
     *     await client.query('INSERT INTO sales (store_id, amount) VALUES ($1, $2)', [1, 100]);
     *     
     *     // Second operation in the transaction
     *     const result = await client.query('SELECT * FROM sales WHERE store_id = $1', [1]);
     *     
     *     return result.rows;
     *   });
     * }
     */
    async transaction<T>(callback: (client: PgService) => Promise<T>): Promise<T> {
      // Iniciar a transação
      await this.query('BEGIN');
      try {
        // Executar o callback passando o próprio PgService
        const result = await callback(this);
  
        // Confirmar a transação
        await this.query('COMMIT');
        return result;
      } catch (error) {
        // Reverter a transação em caso de erro
        await this.query('ROLLBACK');
        throw error;
      }
    }

    async onModuleInit() {
        await this.connect();
      }
    
    async onModuleDestroy() {
      await this.end();
    }
}
