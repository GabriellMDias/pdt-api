import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PgService } from 'src/db/pg/pg.service';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { MobileSyncReceiptRow, MobileSyncReceiptStatus } from './mobile-sync.types';

type InsertReceiptInput = {
  receiptId: string;
  eventId: string;
  eventType: string;
  aggregateType: string | null;
  aggregateKey: string | null;
  storeId: number | null;
  userId: number;
  deviceId: string | null;
  schemaVersion: number;
  payloadHash: string;
  requestPayloadJson: string;
  createdAt: string;
};

type ListLogsInput = {
  initialDate?: string;
  finalDate?: string;
  userId?: number;
  storeIds?: number[];
  eventTypes?: string[];
  page: number;
  pageSize: number;
};

type ListLogUsersInput = {
  storeIds?: number[];
};

type MobileSyncLogListRow = {
  receipt_id: string;
  event_id: string;
  event_type: string;
  aggregate_type: string | null;
  aggregate_key: string | null;
  store_id: number | null;
  user_id: number;
  device_id: string | null;
  schema_version: number;
  request_payload_json: Record<string, unknown>;
  response_payload_json: Record<string, unknown> | null;
  status: MobileSyncReceiptStatus;
  error_code: string | null;
  error_message: string | null;
  processed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  store_label: string | null;
  duration_ms: number | null;
  total_count: number;
};

type AppUserLookup = {
  id: number;
  name: string;
  email: string;
  codigoUsuarioVrMaster: number | null;
};

export type MobileSyncLogListItem = {
  receiptId: string;
  eventId: string;
  eventType: string;
  aggregateType: string | null;
  aggregateKey: string | null;
  storeId: number | null;
  userId: number;
  deviceId: string | null;
  schemaVersion: number;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
  status: MobileSyncReceiptStatus;
  errorCode: string | null;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  userVrCode: number | null;
  storeLabel: string | null;
  durationMs: number | null;
};

export type MobileSyncLogUserOption = {
  id: number;
  name: string | null;
  email: string | null;
};

@Injectable()
export class MobileSyncReceiptsRepository {
  constructor(
    private readonly pg: PgService,
    private readonly prisma: PrismaService,
  ) {}

  async findByEventId(
    eventId: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<MobileSyncReceiptRow | null> {
    const result = await client.query<MobileSyncReceiptRow>(
      `
        SELECT
          receipt_id,
          event_id,
          event_type,
          aggregate_type,
          aggregate_key,
          store_id,
          user_id,
          device_id,
          schema_version,
          payload_hash,
          request_payload_json,
          response_payload_json,
          status,
          error_code,
          error_message,
          processed_at,
          created_at,
          updated_at
        FROM pdtconnect.mobile_event_receipts
        WHERE event_id = $1
        FOR UPDATE
        LIMIT 1
      `,
      [eventId],
    );

    return result.rows[0] ?? null;
  }

  async insertProcessingReceipt(
    input: InsertReceiptInput,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO pdtconnect.mobile_event_receipts (
          receipt_id,
          event_id,
          event_type,
          aggregate_type,
          aggregate_key,
          store_id,
          user_id,
          device_id,
          schema_version,
          payload_hash,
          request_payload_json,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'processing', $12, $12)
      `,
      [
        input.receiptId,
        input.eventId,
        input.eventType,
        input.aggregateType,
        input.aggregateKey,
        input.storeId,
        input.userId,
        input.deviceId,
        input.schemaVersion,
        input.payloadHash,
        input.requestPayloadJson,
        input.createdAt,
      ],
    );
  }

  async markProcessingForRetry(
    receiptId: string,
    updatedAt: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        UPDATE pdtconnect.mobile_event_receipts
        SET
          status = 'processing',
          error_code = NULL,
          error_message = NULL,
          updated_at = $2
        WHERE receipt_id = $1
      `,
      [receiptId, updatedAt],
    );
  }

  async markProcessed(
    receiptId: string,
    responsePayloadJson: string,
    processedAt: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        UPDATE pdtconnect.mobile_event_receipts
        SET
          status = 'processed',
          response_payload_json = $2::jsonb,
          error_code = NULL,
          error_message = NULL,
          processed_at = $3,
          updated_at = $3
        WHERE receipt_id = $1
      `,
      [receiptId, responsePayloadJson, processedAt],
    );
  }

  async markFailed(
    receiptId: string,
    status: Extract<MobileSyncReceiptStatus, 'temporary_error' | 'permanent_error'>,
    errorCode: string,
    errorMessage: string,
    updatedAt: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        UPDATE pdtconnect.mobile_event_receipts
        SET
          status = $2,
          error_code = $3,
          error_message = $4,
          updated_at = $5
        WHERE receipt_id = $1
      `,
      [receiptId, status, errorCode, errorMessage, updatedAt],
    );
  }

  async listLogs(input: ListLogsInput): Promise<{ items: MobileSyncLogListItem[]; total: number }> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (input.initialDate) {
      params.push(input.initialDate);
      where.push(`r.created_at >= ($${params.length}::date)`);
    }

    if (input.finalDate) {
      params.push(input.finalDate);
      where.push(`r.created_at < ($${params.length}::date + interval '1 day')`);
    }

    if (input.userId) {
      params.push(input.userId);
      where.push(`r.user_id = $${params.length}`);
    }

    if ((input.storeIds?.length ?? 0) > 0) {
      params.push(input.storeIds);
      where.push(`r.store_id = ANY($${params.length}::int[])`);
    }

    if ((input.eventTypes?.length ?? 0) > 0) {
      const exclusions = input.eventTypes!.filter((eventType) => eventType.startsWith('!'));
      const inclusions = input.eventTypes!.filter((eventType) => !eventType.startsWith('!'));

      if (inclusions.length > 0) {
        params.push(inclusions);
        where.push(`r.event_type = ANY($${params.length}::text[])`);
      }

      if (exclusions.length > 0) {
        const values = exclusions
          .flatMap((chunk) => chunk.slice(1).split(','))
          .map((eventType) => eventType.trim())
          .filter(Boolean);

        if (values.length > 0) {
          params.push(values);
          where.push(`NOT (r.event_type = ANY($${params.length}::text[]))`);
        }
      }
    }

    const offset = (input.page - 1) * input.pageSize;
    params.push(input.pageSize);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const result = await this.pg.query<MobileSyncLogListRow>(
      `
        SELECT
          r.receipt_id,
          r.event_id::text AS event_id,
          r.event_type,
          r.aggregate_type,
          r.aggregate_key,
          r.store_id,
          r.user_id,
          r.device_id,
          r.schema_version,
          r.request_payload_json,
          r.response_payload_json,
          r.status,
          r.error_code,
          r.error_message,
          r.processed_at,
          r.created_at,
          r.updated_at,
          COALESCE(
            NULLIF(l.descricao, ''),
            CASE WHEN r.store_id IS NULL THEN NULL ELSE CONCAT('Loja ', r.store_id::text) END
          ) AS store_label,
          CASE
            WHEN r.processed_at IS NOT NULL THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (r.processed_at - r.created_at)) * 1000))::int
            WHEN r.status IN ('temporary_error', 'permanent_error') THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) * 1000))::int
            ELSE NULL
          END AS duration_ms,
          COUNT(*) OVER()::int AS total_count
        FROM pdtconnect.mobile_event_receipts r
        LEFT JOIN public.loja l
          ON l.id = r.store_id
        ${whereSql}
        ORDER BY r.created_at DESC, r.receipt_id DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      params,
    );

    const rows = result.rows;
    const total = rows[0]?.total_count ?? 0;
    const usersById = await this.loadUsersByIds(rows.map((row) => row.user_id));

    return {
      total,
      items: rows.map((row) => {
        const user = usersById.get(row.user_id);

        return {
          receiptId: row.receipt_id,
          eventId: row.event_id,
          eventType: row.event_type,
          aggregateType: row.aggregate_type,
          aggregateKey: row.aggregate_key,
          storeId: row.store_id,
          userId: row.user_id,
          deviceId: row.device_id,
          schemaVersion: row.schema_version,
          requestPayload: row.request_payload_json ?? {},
          responsePayload: row.response_payload_json ?? null,
          status: row.status,
          errorCode: row.error_code,
          errorMessage: row.error_message,
          processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
          userName: user?.name ?? null,
          userEmail: user?.email ?? null,
          userVrCode: user?.codigoUsuarioVrMaster ?? null,
          storeLabel: row.store_label,
          durationMs: row.duration_ms,
        };
      }),
    };
  }

  async listLogUsers(input: ListLogUsersInput): Promise<MobileSyncLogUserOption[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if ((input.storeIds?.length ?? 0) > 0) {
      params.push(input.storeIds);
      where.push(`r.store_id = ANY($${params.length}::int[])`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const result = await this.pg.query<{
      id: number;
    }>(
      `
        SELECT DISTINCT
          r.user_id AS id
        FROM pdtconnect.mobile_event_receipts r
        ${whereSql}
        ORDER BY r.user_id DESC
      `,
      params,
    );

    const userIds = result.rows.map((row) => row.id);
    const usersById = await this.loadUsersByIds(userIds);

    return userIds
      .map((id) => {
        const user = usersById.get(id);
        return {
          id,
          name: user?.name ?? null,
          email: user?.email ?? null,
        };
      })
      .sort((a, b) => {
        const labelA = (a.name?.trim() || a.email?.trim() || `Usuario #${a.id}`).toLocaleLowerCase(
          'pt-BR',
        );
        const labelB = (b.name?.trim() || b.email?.trim() || `Usuario #${b.id}`).toLocaleLowerCase(
          'pt-BR',
        );
        return labelA.localeCompare(labelB, 'pt-BR');
      });
  }

  private async loadUsersByIds(userIds: number[]): Promise<Map<number, AppUserLookup>> {
    const uniqueIds = Array.from(
      new Set(
        userIds.filter((userId): userId is number => Number.isInteger(userId) && userId > 0),
      ),
    );

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        codigoUsuarioVrMaster: true,
      },
    });

    return new Map(users.map((user) => [user.id, user]));
  }
}
