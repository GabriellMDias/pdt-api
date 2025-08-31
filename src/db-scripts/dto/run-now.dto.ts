import { IsOptional, IsString } from 'class-validator';


export class RunNowDto {
@IsOptional() @IsString() reason?: string; // e.g. who/why triggered
}