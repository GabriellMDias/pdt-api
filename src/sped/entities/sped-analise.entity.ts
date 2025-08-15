import { ApiProperty } from "@nestjs/swagger";
import { SpedAnalise } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

class AnalysisTypeResponse {
    @ApiProperty()
    code: string;

    @ApiProperty()
    description: string

    @ApiProperty()
    groupName: string
}

export class SpedAnaliseEntity implements SpedAnalise {
    @ApiProperty()
    id: number;

    @ApiProperty()
    resultadoJson: JsonValue;

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