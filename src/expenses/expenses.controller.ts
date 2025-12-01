import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseEntity } from './entities/expense.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ExpenseApportionmentEntity } from './entities/expense-apportionment.entity';
import { CreateExpenseApportionmentDto } from './dto/create-expense-apportionment.dto';
import { UpdateExpenseApportionmentDto } from './dto/update-expense-apportionment.dto';

@Controller('expenses')
@ApiTags('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: ExpenseEntity})
  create(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(createExpenseDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseEntity, isArray: true})
  findAll() {
    return this.expensesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const expense = await this.expensesService.findOne(id);

    if(!expense) {
      throw new NotFoundException(`Expense with ${id} does not exist.`)
    }

    return expense
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: ExpenseEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(id);
  }

  @Post('expense-apportionments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: ExpenseApportionmentEntity})
  createExpenseApport(@Body() createExpenseApportionmentDto: CreateExpenseApportionmentDto) {
    return this.expensesService.createExpenseApport(createExpenseApportionmentDto);
  }

  @Get('expense-apportionments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseApportionmentEntity, isArray: true})
  findAllExpenseApport() {
    return this.expensesService.findAllExpenseApport();
  }

  @Get('expense-apportionments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseApportionmentEntity})
  async findOneExpenseApport(@Param('id', ParseIntPipe) id: number) {
    const expenseApportionment = await this.expensesService.findOneExpenseApport(id);

    if(!expenseApportionment) {
      throw new NotFoundException(`ExpenseApportionment with ${id} does not exist.`)
    }

    return expenseApportionment
  }

  @Patch('expense-apportionments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: ExpenseApportionmentEntity})
  updateExpenseApport(@Param('id', ParseIntPipe) id: number, @Body() updateExpenseApportionmentDto: UpdateExpenseApportionmentDto) {
    return this.expensesService.updateExpenseApport(id, updateExpenseApportionmentDto);
  }

  @Delete('expense-apportionments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: ExpenseApportionmentEntity})
  removeExpenseApport(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.removeExpenseApport(id);
  }
}
