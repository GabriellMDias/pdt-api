import { PgService } from "src/db/pg/pg.service";
import { AtualizarPrateleiraQueryDto } from "./dto/atualizar-prateleira.query.dto";
import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { NotFoundException } from '@nestjs/common';

export type MobileRuptureCatalogItem = {
    id: number;
    barcode: string | null;
    description: string;
    packageQuantity: number | null;
    packagingTypeId: number | null;
    packagingDescription: string | null;
    shelfCode: string | null;
    activeStatus: boolean;
}

export type RegisterRuptureCollectorItemInput = {
    storeId: number;
    productId: number;
    shelfCode: string;
}

type QueryExecutor = Pick<PoolClient, 'query'> | PgService;

@Injectable()
export class RupturaService {
    constructor (private pg: PgService) {}

    async atualizarPrateleiras(dto: AtualizarPrateleiraQueryDto) {
        const {storeId, initialDate, finalDate} = dto

        const sqlQuery = `
            DO
            $$
            DECLARE
                rec RECORD;
            BEGIN
                FOR rec IN
                    SELECT id_produto, prateleira 
                    FROM rupturacoletor 
                    WHERE data >= '${initialDate}' AND data <= '${finalDate}' AND id_loja = ${storeId}
                    ORDER BY data
                LOOP
                    UPDATE produtocomplemento SET prateleira = rec.prateleira WHERE id_loja = ${storeId} AND id_produto = rec.id_produto;
                    
                END LOOP;
            END;
            $$;
            `;


        const resp = await this.pg.query(sqlQuery)

        return dto
    }

    async listProductsForMobile(storeId: number, client: QueryExecutor = this.pg): Promise<MobileRuptureCatalogItem[]> {
        const sqlQuery = `
            SELECT DISTINCT ON (p.id)
                p.id,
                pa.codigobarras::text AS barcode,
                p.descricaocompleta AS description,
                pa.qtdembalagem AS "packageQuantity",
                pa.id_tipoembalagem AS "packagingTypeId",
                te.descricao AS "packagingDescription",
                pc.prateleira AS "shelfCode",
                (pc.id_situacaocadastro = 1) AS "activeStatus"
            FROM produto p
            JOIN produtocomplemento pc
              ON pc.id_produto = p.id
             AND pc.id_loja = $1
            LEFT JOIN produtoautomacao pa
              ON pa.id_produto = p.id
            LEFT JOIN tipoembalagem te
              ON te.id = pa.id_tipoembalagem
            WHERE pc.id_situacaocadastro = 1
            ORDER BY p.id, pa.codigobarras NULLS LAST
        `;

        const response = await client.query<MobileRuptureCatalogItem>(sqlQuery, [storeId]);
        return response.rows.map((row) => ({
            ...row,
            barcode: row.barcode ?? null,
            description: row.description,
            packageQuantity: row.packageQuantity != null ? Number(row.packageQuantity) : null,
            packagingTypeId: row.packagingTypeId != null ? Number(row.packagingTypeId) : null,
            packagingDescription: row.packagingDescription ?? null,
            shelfCode: row.shelfCode ?? null,
            activeStatus: Boolean(row.activeStatus),
        }));
    }

    async registerCollectorItem(
        input: RegisterRuptureCollectorItemInput,
        client: QueryExecutor = this.pg,
    ): Promise<{ productId: number; description: string }> {
        const productQuery = `
            SELECT
                p.id,
                p.descricaocompleta AS description
            FROM produto p
            JOIN produtocomplemento pc
              ON pc.id_produto = p.id
             AND pc.id_loja = $2
            WHERE p.id = $1
              AND pc.id_situacaocadastro = 1
            LIMIT 1
        `;

        const productResponse = await client.query<{ id: number; description: string }>(
            productQuery,
            [input.productId, input.storeId],
        );

        const product = productResponse.rows[0];
        if (!product) {
            throw new NotFoundException(`Produto ${input.productId} nao encontrado para a loja ${input.storeId}.`);
        }

        const insertQuery = `
            INSERT INTO rupturacoletor (
                prateleira,
                id_produto,
                data,
                id_loja
            )
            VALUES ($1, $2, CURRENT_DATE, $3)
        `;

        await client.query(insertQuery, [input.shelfCode, input.productId, input.storeId]);

        return {
            productId: product.id,
            description: product.description,
        };
    }
}
