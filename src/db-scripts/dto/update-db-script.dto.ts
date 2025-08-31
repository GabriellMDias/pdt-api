import { PartialType } from '@nestjs/mapped-types';
import { CreateDbScriptDto } from './create-db-script.dto';

export class UpdateDbScriptDto extends PartialType(CreateDbScriptDto) {}
