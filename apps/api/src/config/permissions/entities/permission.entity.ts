import { ApiProperty } from "@nestjs/swagger";
import { Permission } from "@prisma/client";

export class PermissionEntity implements Permission {
    @ApiProperty()
    id: number;

    @ApiProperty()
    code: string;

    @ApiProperty()
    label: string;

    @ApiProperty()
    useStorePermission: boolean;

    @ApiProperty({ required: false })
    groupPath?: string;
}
