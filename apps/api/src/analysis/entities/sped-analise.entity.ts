import { ApiProperty } from "@nestjs/swagger";
import type { Prisma } from "@prisma/client";

class AnalysisTypeResponse {
    @ApiProperty()
    code: string;

    @ApiProperty()
    description: string

    @ApiProperty()
    groupName: string
}

export class SpedAnaliseEntity {
    @ApiProperty()
    id: number;

    @ApiProperty()
    resultadoJson: Prisma.JsonValue;

    @ApiProperty()
    analysisTypeId: number;

    @ApiProperty()
    arquivoAnaliseId: number;

    @ApiProperty({ type: AnalysisTypeResponse })
    analysisType: {
        code: string
        description: string
        groupName: string
    };
}
