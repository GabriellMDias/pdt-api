import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { MonthlyResultsService } from './monthly-results.service';
import { CreateMonthlyResultDto } from './dto/create-monthly-result.dto';
import { UpdateMonthlyResultDto } from './dto/update-monthly-result.dto';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MonthlyResultEntity } from './entities/monthly-result.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('monthly-results')
@ApiTags('monthly-results')
export class MonthlyResultsController {
  constructor(private readonly monthlyResultsService: MonthlyResultsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: MonthlyResultEntity, isArray: true})
  @ApiBody({ type: [CreateMonthlyResultDto] })
  create(@Body() createMonthlyResultDto: CreateMonthlyResultDto[]) {
    return this.monthlyResultsService.create(createMonthlyResultDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: MonthlyResultEntity, isArray: true})
  findAll() {
    return this.monthlyResultsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: MonthlyResultEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const monthlyResult = await this.monthlyResultsService.findOne(id);

    if(!monthlyResult) {
      throw new NotFoundException(`MonthlyResult with ${id} does not exist.`)
    }

    return monthlyResult
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: MonthlyResultEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMonthlyResultDto: UpdateMonthlyResultDto) {
    return this.monthlyResultsService.update(id, updateMonthlyResultDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: MonthlyResultEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.monthlyResultsService.remove(id);
  }
}
