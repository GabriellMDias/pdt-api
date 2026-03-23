import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'sim', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'nao', 'off'].includes(normalized)) return false;
  return undefined;
}

export class UpdateMobileReleaseDto {
  @IsOptional()
  @IsString()
  changelog?: string;

  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  isLatest?: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
