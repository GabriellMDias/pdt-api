import { PartialType } from '@nestjs/swagger';
import { CreateMonthlyResultDto } from './create-monthly-result.dto';

export class UpdateMonthlyResultDto extends PartialType(CreateMonthlyResultDto) {}
