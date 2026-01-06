import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { PreExpensesService } from './pre-expenses.service';
import { CreatePreExpenseDto } from './dto/create-pre-expense.dto';
import { UpdatePreExpenseDto } from './dto/update-pre-expense.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PreExpenseEntity } from './entities/pre-expense.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('pre-expenses')
@ApiTags('pre-expenses')
export class PreExpensesController {
  constructor(private readonly preExpensesService: PreExpensesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: PreExpenseEntity})
  create(@Body() createPreExpenseDto: CreatePreExpenseDto) {
    return this.preExpensesService.create(createPreExpenseDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: PreExpenseEntity, isArray: true})
  findAll() {
    return this.preExpensesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: PreExpenseEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const preExpense = await this.preExpensesService.findOne(id);

    if(!preExpense) {
      throw new NotFoundException(`PreExpense with ${id} does not exist.`)
    }

    return preExpense
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: PreExpenseEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePreExpenseDto: UpdatePreExpenseDto) {
    return this.preExpensesService.update(id, updatePreExpenseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: PreExpenseEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.preExpensesService.remove(id);
  }
}
