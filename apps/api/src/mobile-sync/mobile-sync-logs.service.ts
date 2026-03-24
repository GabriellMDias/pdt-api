import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import {
  ListMobileSyncLogsQueryDto,
  MobileSyncLogRoutineType,
} from './dto/list-mobile-sync-logs.query.dto';
import {
  MobileSyncLogListItem,
  MobileSyncLogUserOption,
  MobileSyncReceiptsRepository,
} from './mobile-sync.receipts.repository';

const PERMISSION_CODE = 'mobile-sync-logs:consultar';

const ROUTINE_BY_EVENT_TYPE: Record<string, { key: MobileSyncLogRoutineType; label: string }> = {
  'rupture.item.reported': { key: 'ruptura', label: 'Ruptura' },
  'exchange.item.recorded': { key: 'troca', label: 'Troca' },
  'consumption.item.recorded': { key: 'consumo', label: 'Consumo' },
  'production.item.recorded': { key: 'producao', label: 'Producao' },
  'balance.item.recorded': { key: 'balanco', label: 'Balanco' },
};

const EVENT_TYPES_BY_ROUTINE: Record<MobileSyncLogRoutineType, string[] | null> = {
  ruptura: ['rupture.item.reported'],
  troca: ['exchange.item.recorded'],
  consumo: ['consumption.item.recorded'],
  producao: ['production.item.recorded'],
  balanco: ['balance.item.recorded'],
  outro: null,
};

@Injectable()
export class MobileSyncLogsService {
  constructor(
    private readonly receiptsRepository: MobileSyncReceiptsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listLogs(userId: number, dto: ListMobileSyncLogsQueryDto) {
    const storeIds = await this.resolvePermittedStoreIds(userId, dto.storeIds);
    const eventTypes = this.resolveEventTypes(dto.routineType);
    const page = dto.page;
    const pageSize = dto.pageSize;

    const result = await this.receiptsRepository.listLogs({
      initialDate: dto.initialDate,
      finalDate: dto.finalDate,
      userId: dto.userId,
      storeIds,
      eventTypes,
      page,
      pageSize,
    });

    return {
      items: result.items.map((item) => this.toView(item)),
      total: result.total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    };
  }

  async listAvailableUsers(userId: number): Promise<MobileSyncLogUserOption[]> {
    const storeIds = await this.resolvePermittedStoreIds(userId);
    return this.receiptsRepository.listLogUsers({ storeIds });
  }

  private resolveEventTypes(routineType?: MobileSyncLogRoutineType): string[] | undefined {
    if (!routineType) {
      return undefined;
    }

    if (routineType === 'outro') {
      const known = Object.values(EVENT_TYPES_BY_ROUTINE)
        .flatMap((types) => types ?? [])
        .filter(Boolean);
      return [`!${known.join(',')}`];
    }

    return EVENT_TYPES_BY_ROUTINE[routineType] ?? undefined;
  }

  private async resolvePermittedStoreIds(
    userId: number,
    requestedStoreIds?: number[],
  ): Promise<number[] | undefined> {
    if (userId === 0) {
      return requestedStoreIds;
    }

    const grants = await this.prisma.userPermission.findMany({
      where: {
        userId,
        permission: { code: PERMISSION_CODE },
      },
      select: { storeId: true },
    });

    if (grants.some((grant) => grant.storeId === null)) {
      return requestedStoreIds;
    }

    const allowedStoreIds = Array.from(
      new Set(
        grants
          .map((grant) => grant.storeId)
          .filter((storeId): storeId is number => typeof storeId === 'number'),
      ),
    );

    if ((requestedStoreIds?.length ?? 0) > 0) {
      const denied = requestedStoreIds!.filter((storeId) => !allowedStoreIds.includes(storeId));
      if (denied.length > 0) {
        throw new ForbiddenException(
          `Voce nao tem permissao para consultar as lojas: ${denied.join(', ')}.`,
        );
      }

      return requestedStoreIds;
    }

    return allowedStoreIds;
  }

  private toView(item: MobileSyncLogListItem) {
    const routine = ROUTINE_BY_EVENT_TYPE[item.eventType] ?? {
      key: 'outro' satisfies MobileSyncLogRoutineType,
      label: 'Outro',
    };
    const statusLabel = this.getStatusLabel(item.status);
    const summary = this.getSummary(item);

    return {
      receiptId: item.receiptId,
      eventId: item.eventId,
      eventType: item.eventType,
      routineType: routine.key,
      routineLabel: routine.label,
      aggregateType: item.aggregateType,
      aggregateKey: item.aggregateKey,
      storeId: item.storeId,
      storeLabel: item.storeLabel,
      userId: item.userId,
      userName: item.userName,
      userEmail: item.userEmail,
      userVrCode: item.userVrCode,
      status: item.status,
      statusLabel,
      result:
        item.status === 'processed'
          ? 'Sucesso'
          : item.status === 'processing'
            ? 'Em andamento'
            : 'Erro',
      summary,
      durationMs: item.durationMs,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
      deviceId: item.deviceId,
      createdAt: item.createdAt,
      processedAt: item.processedAt,
      updatedAt: item.updatedAt,
      requestPayload: item.requestPayload,
      responsePayload: item.responsePayload,
    };
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'processed':
        return 'Processado';
      case 'processing':
        return 'Em processamento';
      case 'temporary_error':
        return 'Erro temporario';
      case 'permanent_error':
        return 'Erro permanente';
      default:
        return status;
    }
  }

  private getSummary(item: MobileSyncLogListItem): string {
    if (item.errorMessage?.trim()) {
      return item.errorMessage.trim();
    }

    const message = this.extractMessage(item.responsePayload);
    if (message) {
      return message;
    }

    const payload = item.requestPayload ?? {};
    const productDescription =
      typeof payload.productDescription === 'string' ? payload.productDescription.trim() : '';
    const reasonDescription =
      typeof payload.reasonDescription === 'string' ? payload.reasonDescription.trim() : '';
    const balanceDescription =
      typeof payload.balanceDescription === 'string' ? payload.balanceDescription.trim() : '';
    const recipeDescription =
      typeof payload.recipeDescription === 'string' ? payload.recipeDescription.trim() : '';
    const shelfCode =
      typeof payload.shelfCode === 'string' ? payload.shelfCode.trim() : '';

    const parts = [productDescription, reasonDescription, balanceDescription, recipeDescription, shelfCode]
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length > 0) {
      return parts.join(' • ');
    }

    return item.status === 'processed'
      ? 'Evento processado com sucesso.'
      : 'Evento registrado para sincronizacao.';
  }

  private extractMessage(value: Record<string, unknown> | null): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const directMessage = value.message;
    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage.trim();
    }

    const resolvedDescription = value.resolvedDescription;
    if (typeof resolvedDescription === 'string' && resolvedDescription.trim()) {
      return resolvedDescription.trim();
    }

    return null;
  }
}
