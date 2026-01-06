import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { TipMov } from "./entities/tip-mov.entity";
import { PgService } from "src/db/pg/pg.service";
import { TipoRestricao } from "./entities/tipo-restricao.entity";
import { RestricaoTopQueryDto } from "./dto/restricao-top.query.dto";
import { RestricaoTop, RestricaoTopRaw } from "./entities/restricao-top.entity";
import { mapRestricaoTopRawToRestricaoTop } from "./utils/mapRestricaoTopRawToRestricaoTop";
import { UpdateRestricaoTopDto } from "./dto/update-restricao-top.dto";
import { Top } from "./entities/top.entity";
import { Store } from "./entities/store.entity";
import { GetStoresQueryDto } from "./dto/get-stores.query.dto";
import { Supplier } from "./entities/supplier.entity";
import { GetSuppliersQueryDto } from "./dto/get-suppliers.query.dto";
import { Product } from "./entities/product.entity";
import { GetProductsQueryDto } from "./dto/get-products.query.dto";
import { User } from "./entities/user.entity";
import { GetUsersQueryDto } from "./dto/get-users.query.dto";
import { ProductType } from "./entities/product-type.entity";
import { GetProductTypesQueryDto } from "./dto/get-product-types.query.dto";


@Injectable()
export class TopService {
    constructor(private pg: PgService) {}

    

    async getTipMov() {
        try {
            const getTipMovQuery = `
                SELECT id, descricao FROM pdtconnect.top_tipmov
            `

            const getTipMovResult = await this.pg.query<TipMov>(getTipMovQuery)

            return getTipMovResult.rows
        } catch (error) {
            console.error('Database query failed at getTipMov:', error);
            throw new InternalServerErrorException('Failed to retrieve tip mov. Please try again later.');
        }
    }

    async getTipoRestricao() {
        try {
            const getTipoRestricaoQuery = `SELECT id, descricao FROM pdtconnect.top_tiporestricao`

            const getTipoRestricaoResult = await this.pg.query<TipoRestricao>(getTipoRestricaoQuery)

            return getTipoRestricaoResult.rows
        } catch (error) {
            console.error('Database query failed at getTipoRestricao:', error);
            throw new InternalServerErrorException('Failed to retrieve Tipo Restrição. Please try again later.');
        }
    }

    async getRestricaoTop(dto: RestricaoTopQueryDto) {
        try {
            const { codtipoper, tipmov, tiporestricao } = dto

            const params: [number, number, number] = [
                codtipoper, tipmov, tiporestricao
            ]
            
            const getRestricaoTopQuery = `SELECT 
                                                codtipoper,
                                                id_tipmov,
                                                id_tiporestricao,
                                                codcolrest,
                                                serie,
                                                restricao
                                            FROM pdtconnect.top_restricao 
                                            WHERE  codtipoper = $1 
                                            AND id_tipmov = $2
                                            AND id_tiporestricao = $3;`

            const getRestricaoTopResult = await this.pg.query<RestricaoTopRaw, [number, number, number]>(getRestricaoTopQuery, params)


            const restricaoTop = mapRestricaoTopRawToRestricaoTop(getRestricaoTopResult.rows);

            return restricaoTop
        } catch (error) {
            console.error('Database query failed at getRestricaoTop:', error);
            throw new InternalServerErrorException('Failed to retrieve Restrição TOP. Please try again later.');
        }
    }

    async getTops() {
        try {
            const getTopsQuery = `SELECT * FROM (SELECT 
                                        id,
                                        descricao,
                                        CASE WHEN tipo = 'D' THEN 3 ELSE 1 END AS tipmov,
                                        id_situacaocadastro
                                    FROM tipoentrada
                                    UNION ALL
                                    SELECT 
                                        id,
                                        descricao,
                                        2 AS tipmov,
                                        id_situacaocadastro
                                    FROM tiposaida) q ORDER BY 3, 2
                                    `
            
            const getTopsResult = await this.pg.query<Top>(getTopsQuery)

            return getTopsResult.rows
        } catch (error) {
            console.error('Database query failed at getTops:', error);
            throw new InternalServerErrorException('Failed to retrieve TOPs. Please try again later.');
        }
    }

    async getStores(dto: GetStoresQueryDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 20;
            const offset = (page - 1) * limit;

            const q = dto.q?.trim();
            const whereParts: string[] = [];
            const params: any[] = [];

            if (q) {
            const isNumeric = /^\d+$/.test(q);

            if (isNumeric) {
                // Mantém possibilidade de usar índice no id (igualdade)
                const idParamIdx = params.length + 1;
                const descParamIdx = params.length + 2;

                whereParts.push(`(id = $${idParamIdx} OR descricao ILIKE $${descParamIdx})`);
                params.push(Number(q), `%${q}%`);
            } else {
                const descParamIdx = params.length + 1;
                whereParts.push(`descricao ILIKE $${descParamIdx}`);
                params.push(`%${q}%`);
            }
            }

            const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

            // Total
            const countQuery = `SELECT COUNT(*)::int AS total FROM loja ${whereSql}`;
            const countResult = await this.pg.query<{ total: number }>(countQuery, params);
            const total = countResult.rows[0]?.total ?? 0;

            // Dados
            const limitIdx = params.length + 1;
            const offsetIdx = params.length + 2;
            const dataQuery = `
            SELECT id, descricao
            FROM loja
            ${whereSql}
            ORDER BY id
            LIMIT $${limitIdx}
            OFFSET $${offsetIdx}
            `;

            const dataParams = [...params, limit, offset];
            const dataResult = await this.pg.query<Store>(dataQuery, dataParams);

            return {
            data: dataResult.rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            };
        } catch (error) {
            console.error("Database query failed at getStores:", error);
            throw new InternalServerErrorException("Failed to retrieve stores. Please try again later.");
        }
    }
    
    async getSuppliers(dto: GetSuppliersQueryDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 20;
            const offset = (page - 1) * limit;

            const q = dto.q?.trim();
            const whereParts: string[] = [];
            const params: any[] = [];

            if (q) {
            const isNumeric = /^\d+$/.test(q);

            if (isNumeric) {
                const idIdx = params.length + 1;
                const rsIdx = params.length + 2;

                whereParts.push(`(id = $${idIdx} OR razaosocial ILIKE $${rsIdx})`);
                params.push(Number(q), `%${q}%`);
            } else {
                const rsIdx = params.length + 1;

                whereParts.push(`razaosocial ILIKE $${rsIdx}`);
                params.push(`%${q}%`);
            }
            }

            const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

            /* Total de registros */
            const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM fornecedor
            ${whereSql}
            `;
            const countResult = await this.pg.query<{ total: number }>(countQuery, params);
            const total = countResult.rows[0]?.total ?? 0;

            /* Dados paginados */
            const limitIdx = params.length + 1;
            const offsetIdx = params.length + 2;

            const dataQuery = `
            SELECT
                id,
                razaosocial
            FROM fornecedor
            ${whereSql}
            ORDER BY razaosocial, id
            LIMIT $${limitIdx}
            OFFSET $${offsetIdx}
            `;

            const dataParams = [...params, limit, offset];
            const dataResult = await this.pg.query<Supplier>(dataQuery, dataParams);

            return {
            data: dataResult.rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            };
        } catch (error) {
            console.error("Database query failed at getSuppliers:", error);
            throw new InternalServerErrorException(
            "Failed to retrieve suppliers. Please try again later.",
            );
        }
    }

    async getProducts(dto: GetProductsQueryDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 20;
            const offset = (page - 1) * limit;

            const q = dto.q?.trim();
            const whereParts: string[] = [];
            const params: any[] = [];

            if (q) {
            const isNumeric = /^\d+$/.test(q);

            if (isNumeric) {
                const idIdx = params.length + 1;
                const descIdx = params.length + 2;

                whereParts.push(
                `(id = $${idIdx} OR descricaocompleta ILIKE $${descIdx})`
                );
                params.push(Number(q), `%${q}%`);
            } else {
                const descIdx = params.length + 1;

                whereParts.push(`descricaocompleta ILIKE $${descIdx}`);
                params.push(`%${q}%`);
            }
            }

            const whereSql = whereParts.length
            ? `WHERE ${whereParts.join(" AND ")}`
            : "";

            /* Total */
            const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM produto
            ${whereSql}
            `;
            const countResult = await this.pg.query<{ total: number }>(
            countQuery,
            params,
            );
            const total = countResult.rows[0]?.total ?? 0;

            /* Dados */
            const limitIdx = params.length + 1;
            const offsetIdx = params.length + 2;

            const dataQuery = `
            SELECT
                id,
                descricaocompleta
            FROM produto
            ${whereSql}
            ORDER BY descricaocompleta, id
            LIMIT $${limitIdx}
            OFFSET $${offsetIdx}
            `;

            const dataParams = [...params, limit, offset];
            const dataResult = await this.pg.query<Product>(dataQuery, dataParams);

            return {
            data: dataResult.rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            };
        } catch (error) {
            console.error("Database query failed at getProducts:", error);
            throw new InternalServerErrorException(
            "Failed to retrieve products. Please try again later.",
            );
        }
    }

    async getUsers(dto: GetUsersQueryDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 20;
            const offset = (page - 1) * limit;

            const q = dto.q?.trim();
            const whereParts: string[] = [];
            const params: any[] = [];

            if (q) {
            const isNumeric = /^\d+$/.test(q);

            if (isNumeric) {
                const idIdx = params.length + 1;
                const nomeIdx = params.length + 2;

                whereParts.push(`(id = $${idIdx} OR nome ILIKE $${nomeIdx})`);
                params.push(Number(q), `%${q}%`);
            } else {
                const nomeIdx = params.length + 1;

                whereParts.push(`nome ILIKE $${nomeIdx}`);
                params.push(`%${q}%`);
            }
            }

            const whereSql = whereParts.length
            ? `WHERE ${whereParts.join(" AND ")}`
            : "";

            /* Total */
            const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM usuario
            ${whereSql}
            `;
            const countResult = await this.pg.query<{ total: number }>(
            countQuery,
            params,
            );
            const total = countResult.rows[0]?.total ?? 0;

            /* Dados */
            const limitIdx = params.length + 1;
            const offsetIdx = params.length + 2;

            const dataQuery = `
            SELECT
                id,
                nome
            FROM usuario
            ${whereSql}
            ORDER BY nome, id
            LIMIT $${limitIdx}
            OFFSET $${offsetIdx}
            `;

            const dataParams = [...params, limit, offset];
            const dataResult = await this.pg.query<User>(dataQuery, dataParams);

            return {
            data: dataResult.rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            };
        } catch (error) {
            console.error("Database query failed at getUsers:", error);
            throw new InternalServerErrorException(
            "Failed to retrieve users. Please try again later.",
            );
        }
    }

    async getProductTypes(dto: GetProductTypesQueryDto) {
        try {
            const page = dto.page ?? 1;
            const limit = dto.limit ?? 20;
            const offset = (page - 1) * limit;

            const q = dto.q?.trim();
            const whereParts: string[] = [];
            const params: any[] = [];

            if (q) {
            const isNumeric = /^\d+$/.test(q);

            if (isNumeric) {
                const idIdx = params.length + 1;
                const descIdx = params.length + 2;

                whereParts.push(`(id = $${idIdx} OR descricao ILIKE $${descIdx})`);
                params.push(Number(q), `%${q}%`);
            } else {
                const descIdx = params.length + 1;

                whereParts.push(`descricao ILIKE $${descIdx}`);
                params.push(`%${q}%`);
            }
            }

            const whereSql = whereParts.length
            ? `WHERE ${whereParts.join(" AND ")}`
            : "";

            /* Total */
            const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM tipoproduto
            ${whereSql}
            `;
            const countResult = await this.pg.query<{ total: number }>(
            countQuery,
            params,
            );
            const total = countResult.rows[0]?.total ?? 0;

            /* Dados */
            const limitIdx = params.length + 1;
            const offsetIdx = params.length + 2;

            const dataQuery = `
            SELECT
                id,
                descricao
            FROM tipoproduto
            ${whereSql}
            ORDER BY descricao, id
            LIMIT $${limitIdx}
            OFFSET $${offsetIdx}
            `;

            const dataParams = [...params, limit, offset];
            const dataResult = await this.pg.query<ProductType>(dataQuery, dataParams);

            return {
            data: dataResult.rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            };
        } catch (error) {
            console.error("Database query failed at getProductTypes:", error);
            throw new InternalServerErrorException(
            "Failed to retrieve product types. Please try again later.",
            );
        }
    }

    async updateRestricaoTop(dto: UpdateRestricaoTopDto): Promise<RestricaoTop> {

        // ======================
        // Validação de domínio
        // ======================

        if (dto.id_tiporestricao === 4) {

            if (!dto.series) {
                throw new BadRequestException(
                    'Para id_tiporestricao = 4, o campo series é obrigatório',
                );
            }

            // remove duplicados e normaliza
            dto.series = [...new Set(dto.series)];
            dto.codcolrest = []; // força vazio para o tipo 4

        } else {

            if (dto.series && dto.series.length > 0) {
                throw new BadRequestException(
                    'O campo series só é permitido quando id_tiporestricao = 4',
                );
            }

            dto.series = undefined; // não grava série para outros tipos

            if (dto.codcolrest) {
                dto.codcolrest = [...new Set(dto.codcolrest)];
            } else {
                dto.codcolrest = [];
            }
        }

        // ======================
        // Persistência (DELETE + INSERT) - funciona mesmo sem registros prévios
        // ======================

        await this.pg.transaction(async (client) => {

            // 1) Remove qualquer configuração existente (se não existir, delete 0 linhas e segue)
            await client.query(
                `
                DELETE FROM pdtconnect.top_restricao
                WHERE codtipoper = $1
                AND id_tipmov = $2
                AND id_tiporestricao = $3
                `,
                [dto.codtipoper, dto.id_tipmov, dto.id_tiporestricao],
            );

            // 2) Insere conforme regra do tipo de restrição
            if (dto.id_tiporestricao === 4) {
                for (const serie of dto.series!) {
                    await client.query(
                        `
                        INSERT INTO pdtconnect.top_restricao (
                            codtipoper, id_tipmov, id_tiporestricao,
                            codcolrest, serie, restricao
                        )
                        VALUES ($1, $2, $3, NULL, $4, $5)
                        `,
                        [
                            dto.codtipoper,
                            dto.id_tipmov,
                            dto.id_tiporestricao,
                            serie,
                            dto.restricao,
                        ],
                    );
                }
            } else {
                for (const codcolrest of dto.codcolrest) {
                    await client.query(
                        `
                        INSERT INTO pdtconnect.top_restricao (
                            codtipoper, id_tipmov, id_tiporestricao,
                            codcolrest, serie, restricao
                        )
                        VALUES ($1, $2, $3, $4, NULL, $5)
                        `,
                        [
                            dto.codtipoper,
                            dto.id_tipmov,
                            dto.id_tiporestricao,
                            codcolrest,
                            dto.restricao,
                        ],
                    );
                }
            }
        });

        // ======================
        // Retorno normalizado (se quiser sempre retornar a estrutura)
        // ======================
        const saved = await this.getRestricaoTop({
            codtipoper: dto.codtipoper,
            tipmov: dto.id_tipmov,
            tiporestricao: dto.id_tiporestricao,
        });

        // Se por algum motivo não retornou, gera um fallback consistente
        if (!saved) {
            return {
                codtipoper: dto.codtipoper,
                id_tipmov: dto.id_tipmov,
                restricoes: [
                    {
                        id_tiporestricao: dto.id_tiporestricao,
                        codcolrest: dto.id_tiporestricao === 4 ? [] : dto.codcolrest,
                        series: dto.id_tiporestricao === 4 ? dto.series! : null,
                        restricao: dto.restricao,
                    },
                ],
            };
        }

        return saved;
    }
}