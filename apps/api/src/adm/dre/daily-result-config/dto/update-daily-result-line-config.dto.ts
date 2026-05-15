import { PartialType } from '@nestjs/swagger';
import { CreateDailyResultLineConfigDto } from './create-daily-result-line-config.dto';

export class UpdateDailyResultLineConfigDto extends PartialType(
  CreateDailyResultLineConfigDto,
) {}
