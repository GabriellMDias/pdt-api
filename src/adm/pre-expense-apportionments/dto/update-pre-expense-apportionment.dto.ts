import { PartialType } from '@nestjs/swagger';
import { CreatePreExpenseApportionmentDto } from './create-pre-expense-apportionment.dto';

export class UpdatePreExpenseApportionmentDto extends PartialType(CreatePreExpenseApportionmentDto) {}
