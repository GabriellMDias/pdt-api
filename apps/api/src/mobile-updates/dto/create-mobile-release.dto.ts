import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'sim', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'nao', 'off'].includes(normalized)) return false;
  return undefined;
}

function toNumber(value: unknown): number {
  return Number(value);
}

export class CreateMobileReleaseDto {
  @IsString()
  @MaxLength(32)
  versionName!: string;

  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  buildNumber!: number;

  @IsOptional()
  @IsString()
  changelog?: string;

  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}
