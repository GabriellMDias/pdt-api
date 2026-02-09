import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PgService } from './pg.service';

@Injectable()
export class PdtConnectBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PdtConnectBootstrapService.name);

  constructor(private readonly pg: PgService) {}

  async onApplicationBootstrap() {
    // Toggle opcional (default: habilitado)
    const flag = (process.env.PDTCONNECT_BOOTSTRAP ?? 'true').toLowerCase();
    if (['0', 'false', 'no', 'off'].includes(flag)) {
      this.logger.log('Bootstrap pdtconnect desabilitado via PDTCONNECT_BOOTSTRAP.');
      return;
    }

    await this.pg.transaction(async (c) => {
      // Evita corrida se mais de uma instância subir ao mesmo tempo
      await c.query(`SELECT pg_advisory_xact_lock(hashtext('pdtconnect.bootstrap'))`);

      // 1) Schema
      await c.query(`CREATE SCHEMA IF NOT EXISTS pdtconnect;`);

      // 2) Tabelas (criação "base" idempotente)
      await c.query(`
        CREATE TABLE IF NOT EXISTS pdtconnect.top_tiporestricao (
          id INTEGER PRIMARY KEY,
          descricao VARCHAR(255) NOT NULL
        );
      `);

      await c.query(`
        CREATE TABLE IF NOT EXISTS pdtconnect.top_tipmov (
          id INTEGER PRIMARY KEY,
          descricao VARCHAR(255) NOT NULL
        );
      `);

      await c.query(`
        CREATE TABLE IF NOT EXISTS pdtconnect.top_restricao (
          codtipoper INTEGER NOT NULL,
          id_tipmov INTEGER NOT NULL,
          id_tiporestricao INTEGER NOT NULL,
          codcolrest INTEGER NULL,
          serie VARCHAR(50) NULL,
          restricao CHAR(1) NOT NULL
        );
      `);

      // 3) Garante colunas (caso a tabela já exista mas esteja incompleta)
      await c.query(`ALTER TABLE pdtconnect.top_restricao ADD COLUMN IF NOT EXISTS codtipoper INTEGER NOT NULL;`);
      await c.query(`ALTER TABLE pdtconnect.top_restricao ADD COLUMN IF NOT EXISTS id_tipmov INTEGER NOT NULL;`);
      await c.query(`ALTER TABLE pdtconnect.top_restricao ADD COLUMN IF NOT EXISTS id_tiporestricao INTEGER NOT NULL;`);
      await c.query(`ALTER TABLE pdtconnect.top_restricao ADD COLUMN IF NOT EXISTS codcolrest INTEGER NULL;`);
      await c.query(`ALTER TABLE pdtconnect.top_restricao ADD COLUMN IF NOT EXISTS serie VARCHAR(50) NULL;`);
      await c.query(`ALTER TABLE pdtconnect.top_restricao ADD COLUMN IF NOT EXISTS restricao CHAR(1) NOT NULL;`);

      // 4) Constraints (criadas apenas se não existirem)
      await c.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'pdtconnect.top_restricao'::regclass
              AND conname = 'ck_top_restricao_restricao'
          ) THEN
            ALTER TABLE pdtconnect.top_restricao
              ADD CONSTRAINT ck_top_restricao_restricao
              CHECK (restricao IN ('S','N'));
          END IF;
        END $$;
      `);

      await c.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'pdtconnect.top_restricao'::regclass
              AND conname = 'ck_top_restricao_codcolrest_xor_serie'
          ) THEN
            ALTER TABLE pdtconnect.top_restricao
              ADD CONSTRAINT ck_top_restricao_codcolrest_xor_serie
              CHECK (
                (codcolrest IS NOT NULL AND serie IS NULL)
                OR
                (codcolrest IS NULL AND serie IS NOT NULL)
              );
          END IF;
        END $$;
      `);

      await c.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid = 'pdtconnect.top_restricao'::regclass
              AND c.contype = 'f'
              AND pg_get_constraintdef(c.oid) LIKE '%FOREIGN KEY (id_tipmov) REFERENCES pdtconnect.top_tipmov(id)%'
          ) THEN
            ALTER TABLE pdtconnect.top_restricao
              ADD CONSTRAINT fk_top_restricao_tipmov
              FOREIGN KEY (id_tipmov)
              REFERENCES pdtconnect.top_tipmov (id);
          END IF;
        END $$;
      `);

      await c.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid = 'pdtconnect.top_restricao'::regclass
              AND c.contype = 'f'
              AND pg_get_constraintdef(c.oid) LIKE '%FOREIGN KEY (id_tiporestricao) REFERENCES pdtconnect.top_tiporestricao(id)%'
          ) THEN
            ALTER TABLE pdtconnect.top_restricao
              ADD CONSTRAINT fk_top_restricao_tiporestricao
              FOREIGN KEY (id_tiporestricao)
              REFERENCES pdtconnect.top_tiporestricao (id);
          END IF;
        END $$;
      `);

      // 5) Índices únicos parciais (idempotentes)
      await c.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_top_restricao_por_codcolrest
        ON pdtconnect.top_restricao (codtipoper, id_tipmov, id_tiporestricao, codcolrest)
        WHERE codcolrest IS NOT NULL;
      `);

      await c.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_top_restricao_por_serie
        ON pdtconnect.top_restricao (codtipoper, id_tipmov, id_tiporestricao, serie)
        WHERE serie IS NOT NULL;
      `);

      // 6) Seed via UPSERT (não apaga nada, só garante os IDs e descrições)
      await c.query(`
        INSERT INTO pdtconnect.top_tiporestricao (id, descricao)
        VALUES
          (1, 'Loja'),
          (2, 'Fornecedor'),
          (3, 'Produto'),
          (4, 'Série'),
          (5, 'Usuário'),
          (6, 'Tipo Produto')
        ON CONFLICT (id) DO UPDATE
          SET descricao = EXCLUDED.descricao;
      `);

      await c.query(`
        INSERT INTO pdtconnect.top_tipmov (id, descricao)
        VALUES
          (1, 'Nota Entrada'),
          (2, 'Nota Saída'),
          (3, 'Nota Despesa')
        ON CONFLICT (id) DO UPDATE
          SET descricao = EXCLUDED.descricao;
      `);
    });

    this.logger.log('Schema pdtconnect garantido e seed aplicado com sucesso.');
  }
}
