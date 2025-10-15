// src/parameters/parameters.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // seu wrapper do Prisma
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ParameterScope, ParameterType } from '@prisma/client';

@Injectable()
export class ParametersService {
  constructor(private readonly prisma: PrismaService) {}

  // Resolve valor efetivo (override da loja > global)
  async getEffectiveByCode(code: string, storeId?: number) {
    const def = await this.prisma.parameterDefinition.findUnique({
      where: { code },
      include: { values: true },
    });
    if (!def) throw new NotFoundException(`Parameter '${code}' not found`);

    // tenta override por loja
    let val = storeId
      ? def.values.find(v => v.tenantKey === `STORE:${storeId}`)
      : undefined;

    // senão global
    if (!val) {
      val = def.values.find(v => v.tenantKey === 'GLOBAL');
    }
    if (!val) throw new NotFoundException(`No value set for '${code}'`);

    return {
      code: def.code,
      type: def.type,
      scope: def.scope,
      value: this.parseValue(val.value, def.type),
      source: val.tenantKey.startsWith('STORE:') ? 'STORE' : 'GLOBAL',
    };
  }

  // Lista definitions + (opcional) effective value p/ uma loja
  async listAll(storeId?: number) {
    const defs = await this.prisma.parameterDefinition.findMany({
      include: { values: true, group: true },
      orderBy: [{ groupId: 'asc' }, { code: 'asc' }],
    });

    return defs.map(def => {
      const storeVal = storeId ? def.values.find(v => v.tenantKey === `STORE:${storeId}`) : undefined;
      const globalVal = def.values.find(v => v.tenantKey === 'GLOBAL');
      const chosen = storeVal ?? globalVal;

      return {
        code: def.code,
        description: def.description,
        group: def.group?.code ?? null,
        scope: def.scope,
        type: def.type,
        value: chosen ? this.parseValue(chosen.value, def.type) : null,
        source: chosen ? (chosen.tenantKey.startsWith('STORE:') ? 'STORE' : 'GLOBAL') : null,
      };
    });
  }

  // Edita valor (GLOBAL ou por loja). Sem criar Definition, sem deletar nada.
  async patchValue(code: string, dto: UpdateParameterDto) {
    const def = await this.prisma.parameterDefinition.findUnique({ where: { code } });
    if (!def) throw new NotFoundException(`Parameter '${code}' not found`);

    const wantsStore = dto.storeId !== undefined && dto.storeId !== null;

    // valida escopo
    if (def.scope === ParameterScope.GLOBAL && wantsStore) {
      throw new BadRequestException(`'${code}' is GLOBAL-only; do not provide storeId`);
    }
    if (def.scope === ParameterScope.STORE && !wantsStore) {
      throw new BadRequestException(`'${code}' requires storeId`);
    }

    // valida e normaliza valor conforme type
    const normalized = this.normalize(dto.value, def.type);

    const tenantKey = wantsStore ? `STORE:${dto.storeId}` : 'GLOBAL';
    const dataBase: any = {
      definitionId: def.id,
      tenantKey,
      value: normalized,
    };
    if (wantsStore) dataBase.storeId = dto.storeId;

    // upsert do Value: como só editamos, isso não cria novas Definitions;
    // apenas garante que existe 1 registro (GLOBAL ou da loja) e atualiza o valor.
    const updated = await this.prisma.parameterValue.upsert({
      where: { definitionId_tenantKey: { definitionId: def.id, tenantKey } },
      update: { value: normalized },
      create: dataBase,
    });

    return {
      code: def.code,
      scope: def.scope,
      type: def.type,
      value: this.parseValue(updated.value, def.type),
      source: wantsStore ? 'STORE' : 'GLOBAL',
    };
  }

  // Conversão de saída
  private parseValue(raw: string, type: ParameterType): any {
    switch (type) {
      case 'INT':  return Number(raw);
      case 'BOOL': return ((raw === 'true' || raw === '1') ? 'true' : 'false');
      case 'JSON': return JSON.parse(raw);
      default:     return raw;
    }
  }

  // Normalização na entrada
  private normalize(input: string, type: ParameterType): string {
    switch (type) {
      case 'INT': {
        const n = Number(input);
        if (!Number.isInteger(n)) throw new BadRequestException('Expected integer');
        return String(n);
      }
      case 'BOOL': {
        const v = String(input).toLowerCase().trim();
        if (!['true','false','1','0'].includes(v)) {
          throw new BadRequestException("Expected boolean ('true'|'false'|'1'|'0')");
        }
        return (v === 'true' || v === '1') ? 'true' : 'false';
      }
      case 'JSON': {
        try { JSON.parse(input); } catch { throw new BadRequestException('Invalid JSON'); }
        return input;
      }
      default:
        return String(input);
    }
  }
}
