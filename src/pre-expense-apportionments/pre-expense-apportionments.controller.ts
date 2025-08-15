import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { PreExpenseApportionmentsService } from './pre-expense-apportionments.service';
import { CreatePreExpenseApportionmentDto } from './dto/create-pre-expense-apportionment.dto';
import { UpdatePreExpenseApportionmentDto } from './dto/update-pre-expense-apportionment.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PreExpenseApportionmentEntity } from './entities/pre-expense-apportionment.entity'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('pre-expense-apportionments')
@ApiTags('pre-expense-apportionments')
export class PreExpenseApportionmentsController {
  constructor(private readonly preExpenseApportionmentsService: PreExpenseApportionmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: PreExpenseApportionmentEntity})
  create(@Body() createPreExpenseApportionmentDto: CreatePreExpenseApportionmentDto) {
    return this.preExpenseApportionmentsService.create(createPreExpenseApportionmentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: PreExpenseApportionmentEntity, isArray: true})
  findAll() {
    return this.preExpenseApportionmentsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: PreExpenseApportionmentEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const preExpenseApportionment = await this.preExpenseApportionmentsService.findOne(id);

    if(!preExpenseApportionment) {
      throw new NotFoundException(`PreExpenseApportionment with ${id} does not exist.`)
    }

    return preExpenseApportionment
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: PreExpenseApportionmentEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePreExpenseApportionmentDto: UpdatePreExpenseApportionmentDto) {
    return this.preExpenseApportionmentsService.update(id, updatePreExpenseApportionmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: PreExpenseApportionmentEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.preExpenseApportionmentsService.remove(id);
  }
}
