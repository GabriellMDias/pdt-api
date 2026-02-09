import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseEntity } from './entities/expense.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PreExpenseEntity } from './entities/pre-expense.entity';
import { UpdatePreExpenseDto } from './dto/update-pre-expense.dto';
import { CreatePreExpenseDto } from './dto/create-pre-expense.dto';
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiCreatedResponse({type: ExpenseEntity})
  create(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(createExpenseDto);
  }

  @Get()
  @ApiOkResponse({type: ExpenseEntity, isArray: true})
  findAll() {
    return this.expensesService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({type: ExpenseEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const expense = await this.expensesService.findOne(id);

    if(!expense) {
      throw new NotFoundException(`Expense with ${id} does not exist.`)
    }

    return expense
  }

  @Patch(':id')
  @ApiCreatedResponse({type: ExpenseEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @ApiOkResponse({type: ExpenseEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(id);
  }

  @Post('pre-expenses')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiCreatedResponse({type: PreExpenseEntity})
    preExpenseCreate(@Body() createPreExpenseDto: CreatePreExpenseDto) {
      return this.expensesService.preExpenseCreate(createPreExpenseDto);
    }
  
    @Get('pre-expenses')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOkResponse({type: PreExpenseEntity, isArray: true})
    preExpenseFindAll() {
      return this.expensesService.preExpenseFindAll();
    }
  
    @Get('pre-expenses/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOkResponse({type: PreExpenseEntity})
    async preExpenseFindOne(@Param('id', ParseIntPipe) id: number) {
      const preExpense = await this.expensesService.preExpenseFindOne(id);
  
      if(!preExpense) {
        throw new NotFoundException(`PreExpense with ${id} does not exist.`)
      }
  
      return preExpense
    }
  
    @Patch('pre-expenses/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiCreatedResponse({type: PreExpenseEntity})
    preExpenseUpdate(@Param('id', ParseIntPipe) id: number, @Body() updatePreExpenseDto: UpdatePreExpenseDto) {
      return this.expensesService.preExpenseUpdate(id, updatePreExpenseDto);
    }
  
    @Delete('pre-expenses/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOkResponse({type: PreExpenseEntity})
    preExpenseRemove(@Param('id', ParseIntPipe) id: number) {
      return this.expensesService.preExpenseRemove(id);
    }
}
