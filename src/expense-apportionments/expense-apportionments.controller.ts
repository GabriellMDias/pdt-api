import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { ExpenseApportionmentsService } from './expense-apportionments.service';
import { CreateExpenseApportionmentDto } from './dto/create-expense-apportionment.dto';
import { UpdateExpenseApportionmentDto } from './dto/update-expense-apportionment.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseApportionmentEntity } from './entities/expense-apportionment.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('expense-apportionments')
@ApiTags('expense-apportionments')
export class ExpenseApportionmentsController {
  constructor(private readonly expenseApportionmentsService: ExpenseApportionmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: ExpenseApportionmentEntity})
  create(@Body() createExpenseApportionmentDto: CreateExpenseApportionmentDto) {
    return this.expenseApportionmentsService.create(createExpenseApportionmentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseApportionmentEntity, isArray: true})
  findAll() {
    return this.expenseApportionmentsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseApportionmentEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const expenseApportionment = await this.expenseApportionmentsService.findOne(id);

    if(!expenseApportionment) {
      throw new NotFoundException(`ExpenseApportionment with ${id} does not exist.`)
    }

    return expenseApportionment
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: ExpenseApportionmentEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateExpenseApportionmentDto: UpdateExpenseApportionmentDto) {
    return this.expenseApportionmentsService.update(id, updateExpenseApportionmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseApportionmentEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expenseApportionmentsService.remove(id);
  }
}
