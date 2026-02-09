import { ApiProperty } from "@nestjs/swagger";

type CostCenterTypeItem = {
    costCenterId?: number | null;
    storeId?: number | null;
    percentage?: number | null;
    participation?: boolean | null;
}

type CostCenterType = {
    id: number;
    description: string;
    id_costcentertype_vr: number;
    codcencus_sankhya?: number | null;
    useParticipationStore: boolean;
    useParticipationCostCenter: boolean;
    verified?: boolean | null;
    costCenterTypeItems: CostCenterTypeItem[];
}

export class CostCenterTypeItemEntity implements CostCenterTypeItem {
    @ApiProperty()
    costCenterId?: number | null;
    @ApiProperty()
    storeId?: number | null;
    @ApiProperty()
    percentage?: number | null;
    @ApiProperty()
    participation?: boolean | null;
}

export class CostCenterTypeEntity implements CostCenterType {
    @ApiProperty()
    id: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    id_costcentertype_vr: number;

    @ApiProperty()
    codcencus_sankhya?: number | null;

    @ApiProperty()
    useParticipationStore: boolean;

    @ApiProperty()
    useParticipationCostCenter: boolean;

    @ApiProperty()
    verified?: boolean | null;

    @ApiProperty({ type: [CostCenterTypeItemEntity] })
    costCenterTypeItems: CostCenterTypeItemEntity[];
}