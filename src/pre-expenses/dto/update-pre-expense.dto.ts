import { PartialType } from '@nestjs/swagger';
import { CreatePreExpenseDto } from './create-pre-expense.dto';

export class UpdatePreExpenseDto extends PartialType(CreatePreExpenseDto) {}
