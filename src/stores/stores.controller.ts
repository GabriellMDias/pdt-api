import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StoreEntity } from './entities/store.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { StoreVrEntity } from './entities/store-vr.entity';

@Controller('stores')
@ApiTags('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: StoreEntity})
  create(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: StoreEntity, isArray: true})
  findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: StoreEntity})
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const store = await this.storesService.findOne(id);
    if(!store) {
      throw new NotFoundException(`Store with ${id} does not exist.`)
    }
    return store
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({type: StoreEntity})
  update(@Param('id', ParseIntPipe) id: number, 
         @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.update(id, updateStoreDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({type: StoreEntity})
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.remove(id);
  }

  @Post('get-stores-vr')
  @ApiOkResponse({type: StoreVrEntity})
  getStoresFromVR() {
    return this.storesService.getStoresFromVR();
  }
}
