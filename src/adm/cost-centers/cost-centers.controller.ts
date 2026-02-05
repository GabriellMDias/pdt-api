import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CostCenterEntity } from './entities/cost-center.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CostCenterVrEntity } from './entities/cost-center-vr.entity';
import { CostCenterTypeEntity, CostCenterTypeItemEntity } from './entities/cost-center-type.entity';
import { CreateCostCenterTypeDto } from './dto/create-cost-center-type.dto';
import { UpdateCostCenterTypeDto } from './dto/update-cost-center-type.dto';
import { CostCenterTypeVrEntity } from './entities/cost-center-type-vr.entity';
import { CostCenterSnkEntity } from './entities/cost-center-snk.entity';

@Controller('cost-centers')
@ApiTags('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({type: CostCenterEntity})
  async createCostCenter(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.createCostCenter(createCostCenterDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({type: CostCenterEntity, isArray: true})
  async findAllCostCenters() {
    return this.costCentersService.findAllCostCenters();
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({type: CostCenterEntity})
  updateCostCenter(@Param('id', ParseIntPipe) id: number, @Body() updateCostCenterDto: UpdateCostCenterDto) {
    return this.costCentersService.updateCostCenter(id, updateCostCenterDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({type: CostCenterEntity})
  removeCostCenter(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.removeCostCenter(id);
  }

  @Post('get-cost-center-vr')
  @ApiOkResponse({type: CostCenterVrEntity, isArray: true})
  async getCostCenterFromVR() {
    return this.costCentersService.getCostCenterFromVR()
  }

  @Post('get-cost-center-snk')
  @ApiOkResponse({type: CostCenterSnkEntity, isArray: true})
  async getCostCenterFromSnk() {
    return this.costCentersService.getCostCenterFromSankhya()
  }

  @Post('get-cost-center-type-vr')
  @ApiOkResponse({type: CostCenterTypeVrEntity, isArray: true})
  async getCostCenterTypeFromVR() {
    return this.costCentersService.getCostCenterTypeFromVR()
  }

  @Post('create-cost-center-type')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({type: CostCenterTypeEntity})
  async createCostCenterType(@Body() createCostCenterTypeDto: CreateCostCenterTypeDto) {
    return this.costCentersService.createCostCenterType(createCostCenterTypeDto);
  }

  @Patch('update-cost-center-type/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({type: CostCenterTypeEntity})
  async updateCostCenterType(@Param('id', ParseIntPipe) id: number, @Body() updateCostCenterTypeDto: UpdateCostCenterTypeDto) {
    return this.costCentersService.updateCostCenterType(id, updateCostCenterTypeDto);
  }

  @Delete('delete-cost-center-type/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({type: CostCenterTypeEntity})
  async removeCostCenterType(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.removeCostCenterType(id);
  }

  @Get('find-all-cost-center-types')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({type: CostCenterTypeEntity, isArray: true})
  async findAllCostCenterTypes() {
    return this.costCentersService.findAllCostCenterTypes();
  }

  @Get('find-one-cost-center-type/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({type: CostCenterTypeEntity})
  async findOneCostCenterType(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.findOneCostCenterType(id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({type: CostCenterEntity})
  async findOneCostCenter(@Param('id', ParseIntPipe) id: number) {
    const costCenter = await this.costCentersService.findOneCostCenter(id);

    if(!costCenter) {
      throw new NotFoundException(`Cost center with ${id} does not exist.`)
    }

    return costCenter
  }
}
