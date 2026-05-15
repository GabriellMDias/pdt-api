import { BadRequestException, Injectable } from '@nestjs/common';
import { MonthlyResultConsolidationStatus } from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { GetMonthlyResultConsolidationsQueryDto } from './dto/get-monthly-result-consolidations.query.dto';
import { ReverseMonthlyResultConsolidationDto } from './dto/reverse-monthly-result-consolidation.dto';

type ConsolidationSource =
  | 'EXPLICIT_STATUS'
  | 'INFERRED_FROM_MONTHLY_RESULT'
  | 'NONE';

@Injectable()
export class MonthlyResultConsolidationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findStatuses(dto: GetMonthlyResultConsolidationsQueryDto) {
    const storeIds = [...new Set(dto.storeIds)].filter((id) => Number.isInteger(id));
    if (storeIds.length === 0) {
      throw new BadRequestException('storeIds is required');
    }

    const initialMonth = this.parseMonth(dto.initialMonth);
    const finalMonth = this.parseMonth(dto.finalMonth);
    if (initialMonth.getTime() > finalMonth.getTime()) {
      throw new BadRequestException('initialMonth must be before finalMonth');
    }

    const months = this.monthRange(initialMonth, finalMonth);
    const finalExclusive = this.addMonths(finalMonth, 1);

    const [stores, explicitStatuses, monthlyResultMonths] = await Promise.all([
      this.prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, storeName: true, description: true },
      }),
      this.prisma.monthlyResultConsolidation.findMany({
        where: {
          storeId: { in: storeIds },
          month: { gte: initialMonth, lt: finalExclusive },
        },
      }),
      this.prisma.monthlyResult.groupBy({
        by: ['storeId', 'date'],
        where: {
          storeId: { in: storeIds },
          date: { gte: initialMonth, lt: finalExclusive },
        },
        _count: { _all: true },
      }),
    ]);

    const storesById = new Map(stores.map((store) => [store.id, store]));
    const explicitByStoreMonth = new Map(
      explicitStatuses.map((status) => [
        this.key(status.storeId, status.month),
        status,
      ]),
    );
    const inferredByStoreMonth = new Set(
      monthlyResultMonths.map((row) => this.key(row.storeId, row.date)),
    );

    return storeIds.flatMap((storeId) => {
      const store = storesById.get(storeId);

      return months.map((month) => {
        const key = this.key(storeId, month);
        const explicit = explicitByStoreMonth.get(key);

        if (explicit) {
          return this.buildRow({
            storeId,
            storeName: this.storeLabel(storeId, store),
            month,
            status: explicit.status,
            source: 'EXPLICIT_STATUS',
            consolidatedAt: explicit.consolidatedAt,
            consolidatedByUserId: explicit.consolidatedByUserId,
            reversedAt: explicit.reversedAt,
            reversedByUserId: explicit.reversedByUserId,
            notes: explicit.notes,
          });
        }

        if (inferredByStoreMonth.has(key)) {
          return this.buildRow({
            storeId,
            storeName: this.storeLabel(storeId, store),
            month,
            status: MonthlyResultConsolidationStatus.CONSOLIDATED,
            source: 'INFERRED_FROM_MONTHLY_RESULT',
          });
        }

        return this.buildRow({
          storeId,
          storeName: this.storeLabel(storeId, store),
          month,
          status: MonthlyResultConsolidationStatus.NOT_CONSOLIDATED,
          source: 'NONE',
        });
      });
    });
  }

  async reverse(
    dto: ReverseMonthlyResultConsolidationDto,
    userId?: number | null,
  ) {
    const month = this.parseMonth(dto.month);
    const nextMonth = this.addMonths(month, 1);

    const [store, explicitStatus, monthlyResultCount] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: dto.storeId },
        select: { id: true, storeName: true, description: true },
      }),
      this.prisma.monthlyResultConsolidation.findUnique({
        where: {
          storeId_month: {
            storeId: dto.storeId,
            month,
          },
        },
      }),
      this.prisma.monthlyResult.count({
        where: {
          storeId: dto.storeId,
          date: {
            gte: month,
            lt: nextMonth,
          },
        },
      }),
    ]);

    if (!store) {
      throw new BadRequestException(`Store ${dto.storeId} not found`);
    }

    if (explicitStatus?.status === MonthlyResultConsolidationStatus.REVERSED) {
      return {
        ...this.buildRow({
          storeId: dto.storeId,
          storeName: this.storeLabel(dto.storeId, store),
          month,
          status: explicitStatus.status,
          source: 'EXPLICIT_STATUS',
          consolidatedAt: explicitStatus.consolidatedAt,
          consolidatedByUserId: explicitStatus.consolidatedByUserId,
          reversedAt: explicitStatus.reversedAt,
          reversedByUserId: explicitStatus.reversedByUserId,
          notes: explicitStatus.notes,
        }),
        monthlyResultRowsPreserved: monthlyResultCount,
        monthlyResultRowsDeleted: 0,
      };
    }

    const canReverse =
      explicitStatus?.status === MonthlyResultConsolidationStatus.CONSOLIDATED ||
      (!explicitStatus && monthlyResultCount > 0);

    if (!canReverse) {
      throw new BadRequestException(
        'Não há consolidação ativa para estornar neste mês e loja.',
      );
    }

    const now = new Date();
    const reversed = await this.prisma.monthlyResultConsolidation.upsert({
      where: {
        storeId_month: {
          storeId: dto.storeId,
          month,
        },
      },
      create: {
        storeId: dto.storeId,
        month,
        status: MonthlyResultConsolidationStatus.REVERSED,
        reversedAt: now,
        reversedByUserId: userId ?? null,
        notes: dto.notes?.trim() || null,
      },
      update: {
        status: MonthlyResultConsolidationStatus.REVERSED,
        reversedAt: now,
        reversedByUserId: userId ?? null,
        notes: dto.notes?.trim() || explicitStatus?.notes || null,
      },
    });

    return {
      ...this.buildRow({
        storeId: dto.storeId,
        storeName: this.storeLabel(dto.storeId, store),
        month,
        status: reversed.status,
        source: 'EXPLICIT_STATUS',
        consolidatedAt: reversed.consolidatedAt,
        consolidatedByUserId: reversed.consolidatedByUserId,
        reversedAt: reversed.reversedAt,
        reversedByUserId: reversed.reversedByUserId,
        notes: reversed.notes,
      }),
      monthlyResultRowsPreserved: monthlyResultCount,
      monthlyResultRowsDeleted: 0,
    };
  }

  private buildRow(input: {
    storeId: number;
    storeName: string;
    month: Date;
    status: MonthlyResultConsolidationStatus;
    source: ConsolidationSource;
    consolidatedAt?: Date | null;
    consolidatedByUserId?: number | null;
    reversedAt?: Date | null;
    reversedByUserId?: number | null;
    notes?: string | null;
  }) {
    return {
      storeId: input.storeId,
      storeName: input.storeName,
      month: this.monthToDateString(input.month),
      status: input.status,
      isConsolidated:
        input.status === MonthlyResultConsolidationStatus.CONSOLIDATED,
      source: input.source,
      consolidatedAt: input.consolidatedAt ?? null,
      consolidatedByUserId: input.consolidatedByUserId ?? null,
      reversedAt: input.reversedAt ?? null,
      reversedByUserId: input.reversedByUserId ?? null,
      notes: input.notes ?? null,
    };
  }

  private parseMonth(value: string) {
    const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
    if (!match) {
      throw new BadRequestException('Month must use YYYY-MM or YYYY-MM-DD');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('Month must be between 01 and 12');
    }

    return new Date(Date.UTC(year, monthIndex, 1));
  }

  private monthRange(initialMonth: Date, finalMonth: Date) {
    const months: Date[] = [];
    let cursor = new Date(initialMonth);
    while (cursor.getTime() <= finalMonth.getTime()) {
      months.push(new Date(cursor));
      cursor = this.addMonths(cursor, 1);
    }
    return months;
  }

  private addMonths(month: Date, amount: number) {
    return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1));
  }

  private key(storeId: number, month: Date) {
    return `${storeId}:${this.monthKey(month)}`;
  }

  private monthKey(month: Date) {
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private monthToDateString(month: Date) {
    return `${this.monthKey(month)}-01`;
  }

  private storeLabel(
    storeId: number,
    store?: { storeName?: string | null; description?: string | null },
  ) {
    return store?.storeName?.trim() || store?.description?.trim() || `Loja ${storeId}`;
  }
}
