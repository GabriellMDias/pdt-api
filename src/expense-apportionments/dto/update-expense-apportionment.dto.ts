import { PartialType } from '@nestjs/swagger';
import { CreateExpenseApportionmentDto } from './create-expense-apportionment.dto';

export class UpdateExpenseApportionmentDto extends PartialType(CreateExpenseApportionmentDto) {}
