import { ApiProperty } from "@nestjs/swagger";
import { ArquivoAnalise } from "@prisma/client";

class UserResponse {
  @ApiProperty()
  name: string;
}

class StoreResponse {
  @ApiProperty()
  storeName: string;
}

class StatusAnaliseResponse {
  @ApiProperty()
  descricao: string;
}

export class ArquivoAnaliseEntity implements ArquivoAnalise {
    @ApiProperty()
    id: number;

    @ApiProperty()
    dataImportacao: Date;

    @ApiProperty()
    mesRef: Date;

    @ApiProperty()
    arquivoNome: string;

    @ApiProperty()
    userId: number;

    @ApiProperty()
    statusAnaliseId: number;

    @ApiProperty()
    storeId: number;

    @ApiProperty({type: UserResponse})
    user: {
        name: string
    };

    @ApiProperty({type: StoreResponse})
    store: {
        storeName: string
    };

    @ApiProperty({type: StatusAnaliseResponse})
    statusAnalise: {
        descricao: string
    }
}