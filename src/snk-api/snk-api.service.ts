import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  ExecuteQueryResponse,
  FieldMetadata,
  LoginResponse,
  QueryRowObject,
  SankhyaResponseBase,
  SankhyaDollarNode,
} from './types/sankhya.types';
import { ParametersService } from 'src/parameters/parameters.service';

type Jsess = { cookieHeader: string; jsessionId: string; idusu?: string };

@Injectable()
export class SnkApiService {
  constructor(
    private readonly http: HttpService,
    private readonly parameters: ParametersService,
  ) {}

  // --------- Helpers ---------
  private unwrap(node?: SankhyaDollarNode | string | null): string | undefined {
    if (!node) return undefined;
    if (typeof node === 'string') return node;
    if (typeof node === 'object' && '$' in node) return String(node.$).trim();
    return undefined;
  }

  private extractJSessionIdFromSetCookie(setCookie?: string[]): string | undefined {
    if (!setCookie?.length) return undefined;
    // procura "JSESSIONID=....;"
    const raw = setCookie.find(c => c.startsWith('JSESSIONID='));
    if (!raw) return undefined;
    const semi = raw.indexOf(';');
    return raw.substring('JSESSIONID='.length, semi > -1 ? semi : undefined);
  }

  private async getBaseEndpoint(): Promise<string> {
    const base = String((await this.parameters.getEffectiveByCode('sankhya.base_url')).value ?? '').trim();
    const port = String((await this.parameters.getEffectiveByCode('sankhya.port')).value ?? '').trim();

    // tenta compor com URL para evitar ":" duplicado
    try {
      const u = new URL(base.startsWith('http') ? base : `http://${base}`);
      if (port) u.port = port;
      return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}/mge/service.sbr?outputType=json`;
    } catch {
      // fallback simples
      return `http://${base}${port ? ':' + port : ''}/mge/service.sbr?outputType=json`;
    }
  }

  private async getCredentials(): Promise<{ username: string; password: string }> {
    const username = String((await this.parameters.getEffectiveByCode('sankhya.username')).value ?? '').trim();
    const password = String((await this.parameters.getEffectiveByCode('sankhya.password')).value ?? '').trim();
    if (!username || !password) throw new BadRequestException('Parâmetros de credencial ausentes (username/password).');
    return { username, password };
  }

  private ensureOk<T>(resp: SankhyaResponseBase<T>): asserts resp is SankhyaResponseBase<T> & { status: '1' } {
    if (resp.status !== '1') {
      const reason = resp.statusMessage || resp.tsError?.tsErrorCode || 'Falha na chamada Sankhya';
      throw new BadRequestException(reason);
    }
  }

  private mapRows(fields: FieldMetadata[], rows: unknown[][]): QueryRowObject[] {
    const cols = fields.sort((a, b) => a.order - b.order);

    return (rows || []).map((r) => {
        const obj: QueryRowObject = {};

        cols.forEach((col, idx) => {
        let value = r[idx];

        if (value === null || value === undefined) {
            obj[col.name] = null;
            return;
        }

        switch (col.userType) {
            case 'S': // String
            obj[col.name] = String(value);
            break;

            case 'I': // Inteiro
            obj[col.name] = Number.isNaN(Number(value))
                ? null
                : parseInt(String(value), 10);
            break;

            case 'F': // Float
            obj[col.name] = Number.isNaN(Number(value))
                ? null
                : parseFloat(String(value));
            break;

            case 'D': // Date
            case 'T': // Timestamp
            // Normaliza para Date se possível
            const parsedDate = new Date(value as string);
            obj[col.name] = isNaN(parsedDate.getTime()) ? String(value) : parsedDate;
            break;

            case 'H': // Hora
            // Pode vir “HH:MM:SS” — mantemos como string, mas poderíamos quebrar em partes
            obj[col.name] = String(value);
            break;

            default:
            // Fallback — mantém valor original
            obj[col.name] = value;
            break;
        }
        });

        return obj;
    });
    }


  // --------- Fluxo Sessão (login -> cookie -> logout) ---------
  private async login(): Promise<Jsess> {
    const endpoint = await this.getBaseEndpoint();
    const { username, password } = await this.getCredentials();

    const url = `${endpoint}&serviceName=MobileLoginSP.login`;
    const payload = {
      serviceName: 'MobileLoginSP.login',
      requestBody: {
        NOMUSU: { $: username },
        INTERNO: { $: password },
        KEEPCONNECTED: { $: 'N' },
      },
    };

    const axiosResp = await lastValueFrom(this.http.post<LoginResponse>(url, payload, { validateStatus: () => true }));
    const data = axiosResp.data;
    const setCookie = axiosResp.headers?.['set-cookie'] as string[] | undefined;

    // status "0" => erro de autenticação
    if (data?.status !== '1') {
      const msg = data?.statusMessage || 'Usuário/Senha inválido.';
      throw new UnauthorizedException(msg);
    }

    const jsessionId = this.extractJSessionIdFromSetCookie(setCookie);
    const jsFromBody = this.unwrap(data?.responseBody?.jsessionid);
    const finalJsession = jsessionId ?? jsFromBody;

    if (!finalJsession) {
      throw new InternalServerErrorException('Não foi possível obter o JSESSIONID.');
    }

    return {
      cookieHeader: `JSESSIONID=${finalJsession}`,
      jsessionId: finalJsession,
      idusu: this.unwrap(data?.responseBody?.idusu),
    };
  }

  private async logout(cookieHeader: string): Promise<void> {
    try {
      const endpoint = await this.getBaseEndpoint();
      const url = `${endpoint}&serviceName=MobileLoginSP.logout`;
      const payload = { serviceName: 'MobileLoginSP.logout' };

      await lastValueFrom(
        this.http.post(url, payload, {
          headers: { Cookie: cookieHeader },
          timeout: 7_000,
          validateStatus: () => true,
        }),
      );
    } catch {
      // ignora erro de logout para não mascarar o resultado principal
    }
  }

  /**
   * Executa uma query via DbExplorerSP.executeQuery com login/logout por requisição.
   * @returns { meta, rows, objects, timeQuery, timeResultSet }
   */
  async executeQuery<T = Record<string, any>>(sql: string) {
    if (!sql || sql.length < 5) {
        throw new BadRequestException('SQL inválido.');
    }

    const sess = await this.login();
    try {
        const endpoint = await this.getBaseEndpoint();
        const url = `${endpoint}&serviceName=DbExplorerSP.executeQuery`;

        const payload = {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
        };

        const axiosResp = await lastValueFrom(
        this.http.post<ExecuteQueryResponse>(url, payload, {
            headers: { Cookie: sess.cookieHeader },
            timeout: 30_000,
            validateStatus: () => true,
        }),
        );

        const data = axiosResp.data;
        this.ensureOk(data);

        const meta = data.responseBody?.fieldsMetadata ?? [];
        const rows = data.responseBody?.rows ?? [];
        const objects = this.mapRows(meta, rows) as T[]; // 👈 Aqui aplicamos o tipo genérico

        if (data.responseBody?.burstLimit) {
        throw new BadRequestException(
            'Limite de burst atingido pela Sankhya (burstLimit). Tente novamente em instantes.',
        );
        }

        return {
        meta,
        rows,
        objects,
        timeQuery: data.responseBody?.timeQuery,
        timeResultSet: data.responseBody?.timeResultSet,
        };
    } finally {
        await this.logout(sess.cookieHeader);
    }
    }

    /**
     * Executa uma query e retorna somente os objetos já tipados.
     * Exemplo:
     *   const funcionarios = await snkApi.executeQueryTyped<Funcionario>(sql);
     */
    async executeQueryTyped<T>(sql: string): Promise<T[]> {
    const result = await this.executeQuery<T>(sql);
    return result.objects;
    }


}
