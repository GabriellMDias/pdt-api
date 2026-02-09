import { PgService } from "src/db/pg/pg.service";
import { AtualizarPrateleiraQueryDto } from "./dto/atualizar-prateleira.query.dto";
import { Injectable } from "@nestjs/common";

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
}