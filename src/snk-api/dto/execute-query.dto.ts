import { IsString, MinLength } from 'class-validator';

export class ExecuteQueryDto {
  @IsString()
  @MinLength(5)
  sql!: string;
}
