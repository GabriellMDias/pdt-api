import { ApiProperty } from "@nestjs/swagger";

interface UserPermissions {
    userId: number,
    permissions: string[]
}

export class UserPermissionEntity implements UserPermissions {
    @ApiProperty()
    userId: number;

    @ApiProperty()
    permissions: string[];
}