import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CostCenterEntity } from './entities/cost-center.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('cost-centers')
@ApiTags('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: CostCenterEntity})
  create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.create(createCostCenterDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: CostCenterEntity, isArray: true})
  findAll() {
    return this.costCentersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: CostCenterEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const costCenter = await this.costCentersService.findOne(id);

    if(!costCenter) {
      throw new NotFoundException(`Cost center with ${id} does not exist.`)
    }

    return costCenter
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: CostCenterEntity})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCostCenterDto: UpdateCostCenterDto) {
    return this.costCentersService.update(id, updateCostCenterDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: CostCenterEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.remove(id);
  }
}
